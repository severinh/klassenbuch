<?php

// Der Zugriff auf die Daten des Klassenbuch erfolgt über diese Datei
define("_KBSECURE", true);

require_once("server.common.php");
require_once("server.jsonrpc.service.php");
require_once("server.compression.php");
require_once("phpthumb/phpthumb.class.php");

// Selbst definierte Fehlermeldungen
JSONRPCErrorCodes::add("AUTHENTICATION_FAILED", 800, "Authentifizierung fehlgeschlagen");
JSONRPCErrorCodes::add("INVALID_DATABASE_QUERY", 801, "Ungültige Datenbankabfrage");

function gettasks($start = 0, $end = 0) {
	global $database;
	
	$settings = Settings::getInstance();
	$user = User::getInstance();
    
    // Wurde kein Beginn des Zeitrahmens angegeben, wird der aktuelle Tag eingesetzt
	if (!$start) {
        $start = mktime(0, 0, 0);
    }
    
    // Die Datenbankabfrage wird um die nötige Bedingung ergänzt, falls ein Ende des Zeitrahmens angegeben wurde
	if ($end != 0) {
        $cond = " AND date < " . mySQLValue($end);
	}
	
    $tasksResponse = $database->query("SELECT * FROM " . $settings->db_tblprefix . "tasks WHERE date >= " . 
		mySQLValue($start) . "$cond ORDER BY date");
		
	if (!$tasksResponse) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . mysql_error());
    }
	
	$tasks = Array();
	$oldestSumbission = time();
	$readBy = Array();
	
    while ($row = mysql_fetch_array($tasksResponse)) {
        $tasks[] = Array(
            "id"          => (int)    $row["id"],
            "date"        => (int)    $row["date"],
            "subject"     => (string) $row["subject"],
            "important"   => (bool)   $row["important"],
            "text"        => (string) $row["text"],
            "userid"      => (int)    $row["userid"],
            "added"       => (int)    $row["added"],
            "removed"     => (bool)   $row["removed"],
        );
        
        if ((int) $row["added"] < $oldestSumbission) {
			$oldestSumbission = (int) $row["added"];
        }
        
		$readBy[(int) $row["id"]] = (string) $row["commentsreadby"];
    }
    
    $commentsResponse = $database->query("SELECT taskid, COUNT(*) AS numberofcomments FROM " . $settings->db_tblprefix .
		"comments WHERE date >= " . mySQLValue($oldestSumbission) . " GROUP BY taskid");
    
	if (!$commentsResponse) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . mysql_error());
    }
    
    $commentsCount = Array();
    
    while ($row = mysql_fetch_array($commentsResponse)) {
		$commentsCount[$row["taskid"]] = (int) $row["numberofcomments"];
    }
    
    foreach ($tasks as $key => $value) {
		$comments = $commentsCount[$value["id"]];
		
		// Ist der Benutzer angemeldet, wird untersucht, ob dieser die Kommentare zur Aufgabe bereits gelesen hat
		if ($comments && $user->authenticated && !in_array($user->id, explode(",", $readBy[$value["id"]]))) {
			$newComments = true;
		} else {
			$newComments = false;
		}
		
		$tasks[$key]["comments"] = (int) $comments;
		$tasks[$key]["newcomments"] = (bool) $newComments;
	}
	
    return $tasks;
}

function removetask($taskid) {
    global $database;
    
    $user = User::getInstance();
	$settings = Settings::getInstance();
    
    if (!$user->authenticated) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
	}
	
    if (!$taskid) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Keine Aufgabe angegeben.");
    }
    
    if (!$database->query("UPDATE " . $settings->db_tblprefix . "tasks SET removed = 1 WHERE id = " . mySQLValue($taskid))) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "\nMySQL-Fehlermeldung: " . mysql_error());
    }
    
    if (mysql_affected_rows() != 1) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Eine Aufgabe mit der ID $taskid existiert nicht.");
	}
	
    return true;
}

function createtask($subject, $date, $text, $important = false) {
    global $database;
    
    $user = User::getInstance();
	$settings = Settings::getInstance();
    
    // Prüft, ob der Benuzter angemeldet ist
    if (!$user->authenticated) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
    
    // Überprüft die Eingabewerte
    if (!$subject) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein Fach angegeben.");
    }
    
    if (!$date) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein Datum angegeben.");
    }
    
    if (!$text) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Keine Aufgabe angegeben.");
    }
    
    // Der aktuelle Timestamp
    $time = time();
    
    // Trägt die Aufgabe in die Datenbank ein
    if (!$database->query("INSERT INTO " . $settings->db_tblprefix . "tasks (date, subject, text, important, userid, " .
		"added) VALUES(" . mySQLValue($date) . ", " .  mySQLValue($subject) . ", " . mySQLValue($text) . ", " . 
		mySQLValue($important) . ", " . $user->id . ", $time)")) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . mysql_error());
    }
    
    return mysql_insert_id();
}

function edittask($id, $date, $text, $important = false) {
    global $database;
    
    $user = User::getInstance();
	$settings = Settings::getInstance();
    
    // Prüft, ob der Benuzter angemeldet ist
    if (!$user->authenticated) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
    
    // Überprüft die Eingabewerte
    if ($id <= 0) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Keine gültige Aufgaben-ID angegeben.");
    }
    
    if (!$date) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein Datum angegeben.");
    }
    
    if (!$text) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Keine Aufgabe angegeben.");
    }
    
    if (!$database->query("UPDATE " . $settings->db_tblprefix . "tasks SET date = " . mySQLValue($date) . ", text = " .
		mySQLValue($text) . ", important = " . mySQLValue($important) . " WHERE id = " . mySQLValue($id))) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . mysql_error());
    }
    
    return true;
}

function getcomments($taskid) {
    global $database;
    
    $user = User::getInstance();
	$settings = Settings::getInstance();
    
    $databaseResponse = $database->query("SELECT * FROM " . $settings->db_tblprefix . "comments WHERE taskid = " .
		mySQLValue($taskid) . " ORDER BY date");
    
    if (!$databaseResponse) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . mysql_error());
	}
	
    $comments = Array();
    
    while ($row = mysql_fetch_array($databaseResponse)) {
        $comments[] = Array(
            "id"          => (int)    $row["id"],
            "taskid"      => (int)    $row["taskid"],
            "userid"      => (int)    $row["userid"],
            "date"        => (int)    $row["date"],
            "text"     => (string) $row["comment"]);  
    }
    
    // Needs rewrite
    if ($user->authenticated) {
        $databaseResponse = $database->query("SELECT * FROM " . $settings->db_tblprefix . "tasks WHERE id = " .
			mySQLValue($taskid));
        
        if ($databaseResponse) {
            $row = mysql_fetch_array($databaseResponse);
            $commentsReadBy = explode(",", $row["commentsreadby"]);
            
            if (!in_array($user->id, $commentsReadBy)) {
                array_push($commentsReadBy, $user->id);
                $database->query("UPDATE " . $settings->db_tblprefix . "tasks SET commentsreadby = " .
					mySQLValue(implode(",", $commentsReadBy)) . " WHERE id = " . mySQLValue($taskid));
            }
        }
    }
    
    return $comments;
}

function createcomment($taskid, $text) {
    global $database;
    
    $user = User::getInstance();
	$settings = Settings::getInstance();
    
    if (!$user->authenticated) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
	}
	
    if (!$text) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein Kommentar angegeben.");
    }
    
	if (mysql_num_rows($database->query("SELECT * FROM " . $settings->db_tblprefix . "tasks WHERE id = " .
		mySQLValue($taskid) . " AND date >= " . mySQLValue(mktime(0, 0, 0)))) != 1) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Aufgaben in der Vergangenheit können leider nicht mehr kommentiert werden.");
	}
    
    if (!$database->query("INSERT INTO " . $settings->db_tblprefix . "comments (taskid, userid, date, comment) VALUES(" .
		mySQLValue($taskid) . ", " . mySQLValue($user->id) . ", " . mySQLValue(time()) . ", " . mySQLValue($text) . ")")) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . mysql_error());
    }
    
    $id = mysql_insert_id();
    $database->query("UPDATE " . $settings->db_tblprefix . "tasks SET commentsreadby = '," . mySQLValue($user->id) .
		"' WHERE id = " . mySQLValue($taskid));
	
    $user->update(Array("posts" => ($user->posts + 1)));

    return $id;
}

function editcomment($id, $text) {
    global $database;
    
    $user = User::getInstance();
	$settings = Settings::getInstance();
    
    if (!$user->authenticated) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
    
    if (!$text) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein Kommentar angegeben.");
	}
	
    $databaseResponse = $database->query("UPDATE " . $settings->db_tblprefix . "comments SET comment = " .
		mySQLValue($text) . " WHERE id = " . mySQLValue($id) . " AND userid = " . mySQLValue($user->id));
		
	if (!$databaseResponse) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . mysql_error());
    }
    
    if (mysql_affected_rows() != 1) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Entweder existiert der Kommentar nicht oder du bist nicht " .
			"autorisiert, den Kommentar zu bearbeiten");
	}
    
    return true;
}

function getcontacts() {
    global $database;
    
    $user = User::getInstance();
	$settings = Settings::getInstance();
    
    $databaseResponse = $database->query("SELECT * FROM " . $settings->db_tblprefix . "users ORDER BY firstname");
    
    if (!$databaseResponse) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . mysql_error());
    }
    
    $contacts = Array();
    
    while ($row = mysql_fetch_array($databaseResponse)) {
        $contacts[] = Array(
            "id"          => (int)    $row["id"],
            "firstname"   => (string) $row["firstname"],
            "surname"     => (string) $row["surname"],
            "nickname"    => (string) $row["nickname"],
            "mail"        => (string) ($user->authenticated) ? $row["mail"]     : (($row["mail"])     ? "hidden" : ""),
            "address"     => (string) ($user->authenticated) ? $row["address"]  : (($row["address"])  ? "hidden" : ""),
            "plz"         => (int)    ($user->authenticated) ? $row["plz"]      : 0,
            "location"    => (string) ($user->authenticated) ? $row["location"] : (($row["location"]) ? "hidden" : ""),
            "phone"       => (string) ($user->authenticated) ? $row["phone"]    : (($row["phone"])    ? "hidden" : ""),
            "mobile"      => (string) ($user->authenticated) ? $row["mobile"]   : (($row["mobile"])   ? "hidden" : ""),
            "mainsubject" => (string) $row["mainsubject"],
            "posts"       => (int)    $row["posts"],
            "classmember" => (bool)   $row["classmember"],
            "lastcontact" => (double) $row["lastcontact"]);
    }
    
    return $contacts;
}

function getfiles() {
    global $database;
    
	$settings = Settings::getInstance();
	
    $databaseResponse = $database->query("SELECT * FROM " . $settings->db_tblprefix . "files ORDER BY uploaded");
    
    if (!$databaseResponse) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . mysql_error());
    }
    
    $files = Array();
    
    while ($row = mysql_fetch_array($databaseResponse)) {
		if ((bool) $row["forcedarchiving"] || time() - (int) $row["uploaded"] >= 2592000) {
			$archived = true;
		} else {
			$archived = false;
		}
		
        $files[] = Array(
            "id"          => (int)    $row["id"],
            "name"        => (string) $row["name"],
            "description" => (string) $row["description"],
            "size"        => (int)    $row["size"],
            "userid"      => (int)    $row["userid"],
            "uploaded"    => (int)    $row["uploaded"],
            "archived"	  => (bool)	  $archived);
    }
    
    return $files;
}

function archivefile($id) {
	global $database;
	
	$user = User::getInstance();
	$settings = Settings::getInstance();
	
    if (!$user->authenticated) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
	
    $response = $database->query("SELECT * FROM " . $settings->db_tblprefix . "files WHERE id = " . mySQLValue($id));
    
    if (!$response) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . mysql_error());
	}
	
    if (mysql_num_rows($response) != 1) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Keine gültige Datei angegeben.");
    }
    
    $file = mysql_fetch_array($response);
	
    if ($file["userid"] != $user->id) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Du darfst diese Datei leider nicht archivieren. " .
			"Dies ist dem Benutzer vorbehalten, der die Datei hochgeladen hat.");
    }
    
    $response = $database->query("UPDATE " . $settings->db_tblprefix . "files SET forcedarchiving = 1 WHERE id = " .
		mySQLValue($id));
    
    if (!$response) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . mysql_error());
	}
	
	return true;
}

function uploadfile($description) {
	global $database;
	
	$user = User::getInstance();
	$settings = Settings::getInstance();
	
    if (!$user->authenticated) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
    
    if (!$description) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Keine Beschreibung eingegeben");    
    }
    
    if ($_FILES["Filedata"]) {
        $date = time();
        
        $fnParts = parseFileName(utf8_decode($_FILES["Filedata"]["name"]));
        
        if (in_array(strtolower($fnParts["ext"]), $settings->upload_extblacklist)) {
			return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Aus Sicherheitsgründen sind keine " . 
				strtoupper($fnParts["ext"]) . "-Dateien erlaubt");
        }
        
        $fnPartsNew = $fnParts;
		
		$i = 1;
		
		while (is_file("files/" . $fnPartsNew["base"] . "." . $fnPartsNew["ext"])) {
			$fnPartsNew["base"] = $fnParts["base"] . "_(" . ++$i .")";
		}
		
		$newFileName = $fnPartsNew["base"] . "." . $fnPartsNew["ext"];
		$fileSize = $_FILES["Filedata"]["size"];
		
		if (move_uploaded_file($_FILES["Filedata"]["tmp_name"], "files/$newFileName")) {
			if ($database->query("INSERT INTO " . $settings->db_tblprefix . "files (name, description, size, userid, " .
				"uploaded) VALUES(" . mySQLValue($newFileName) . ", " . mySQLValue($description) . ", $fileSize, " .
				$user->id . ", $date)")) {
				return Array("id" => mysql_insert_id(), "filename" => $newFileName);
			} else {
				return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . mysql_error());
			}
		} else {
			return new JSONRPCErrorResponse("SERVER_ERROR");
		}
    } else {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Keine Datei hochgeladen");
    }
}

function signin($nickname, $password) {
	$user = User::getInstance();
	
    if (!$user->signIn($nickname, $password)) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
    
    return getuserdata();
}

function requestpassword($username, $password) {
    global $database;

	$settings = Settings::getInstance();
	
    if (!$username) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Keinen Benutzernamen angegeben.");
    }
    
    if (!$password) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein Passwort angegeben.");    
    }
    
    $databaseResponse = $database->query("SELECT * FROM " . $settings->db_tblprefix . "users WHERE nickname = " .
		mySQLValue($username));
    
    if (!$databaseResponse) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "\nMySQL-Fehlermeldung: " . mysql_error());
	}
	
    if (mysql_num_rows($databaseResponse) != 1) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Benutzer existiert nicht.");
	}
	
    $user = mysql_fetch_array($databaseResponse);
    $requestKey = generateRandomString();
    
    if (!$database->query("UPDATE " . $settings->db_tblprefix . "users SET newpassword = " . mySQLValue(md5($password)) .
		", newpasswordkey = " . mySQLValue($requestKey) . " WHERE nickname = " . mySQLValue($username))) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . mysql_error());
    }
    
    if (!mail($user["mail"], "Neues Klassenbuchpasswort bestätigen",
		"Hallo " . $user["firstname"] . ",\n\n" .
        "Du hast im Klassenbuch ein neues Passwort angefordert. Klicke auf den foldenden Link, " .
        "damit dein Passwort endgültig auf \"$password\" gewechselt wird. Wenn du kein Passwort angefordert hast, " .
        "solltest du nicht auf diesen Link klicken, sondern diese E-Mail gleich löschen!\n\n" .
        $settings->domain . "index.php?passwordverification=$requestKey",
        "From: Klassenbuch <" . $settings->mail . ">")) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS");
    }
    
    return true;
}

function verifynewpassword($key) {
    global $database;
    
	$settings = Settings::getInstance();
	
    if (!$key) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein Bestätigungsschlussel angegeben");
    }
    
    $databaseResponse = $database->query("SELECT * FROM " . $settings->db_tblprefix . "users WHERE newpasswordkey = " .
		mySQLValue($key));
    
    if (!$databaseResponse) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . mysql_error());
    }
    
    if (mysql_num_rows($databaseResponse) != 1) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Ungültiger Bestätigungsschlüssel.");
    }
    
    $user = mysql_fetch_array($databaseResponse);    
    
    if (!$database->query("UPDATE " . $settings->db_tblprefix . "users SET password = " . mySQLValue($user["newpassword"]) .
		", newpasswordkey = '', newpassword = '' " . "WHERE id = " . mySQLValue($user["id"]))) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . mysql_error());
    }
    
    return true;
}

function changepassword($newpassword, $currentpassword) {
	global $database;
	
	$user = User::getInstance();
	$settings = Settings::getInstance();
	
    if (!$user->authenticated) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
    
    if (!$newpassword || !$currentpassword) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS");
	}
	
    $response = $database->query("UPDATE " . $settings->db_tblprefix . "users SET password = " .
		mySQLValue(md5($newpassword)) . " WHERE password = " . mySQLValue(md5($currentpassword)) . " AND id = " .
		mySQLValue($user->id));
	
	if (!$response) {
		return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . mysql_error());	
    }
    
    if (mysql_affected_rows() != 1) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Falsches Passwort angegeben.");
    }
    
    return true;
}

function getuserdata() {
	$user = User::getInstance();

    if (!$user->authenticated) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
    
    return Array(
		"id" 		=> $user->id,
		"nickname" 	=> $user->nickname,
		"token" 	=> $user->token,
		"profile" 	=> $user->getProfile(),
		"settings"	=> $user->settings,
		"isadmin" 	=> $user->isadmin
    );
}

function updateuserprofile($profileInformation) {
	$user = User::getInstance();
	
    if (!$user->authenticated) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
    
    if (!$user->update($profileInformation)) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS");
    }
    
	return true;
}

function changeusersettings($settings) {
	$user = User::getInstance();
	
    if (!$user->authenticated) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
    
    $userSettings = Array();
    foreach ($user->settings as $key => $value) {
		$userSettings[$key] = $value;
	}
   
	$user->settings = array_merge($userSettings, $settings);
    
	return $user->saveSettings();
}

function signout() {
    $user = User::getInstance();
    
    return $user->signOut();
}

function registeruser($nickname, $firstname, $surname, $mail, $password) {
	global $database;
	
	$settings = Settings::getInstance();
	
    if (!$nickname) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein Nickname angegeben.");
    }
    
    if (!$firstname) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein Vorname angegeben.");
    }
    
    if (!$surname) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein Nachname angegeben.");
    }
    
    if (!$mail) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Keine E-Mail-Adresse angegeben.");
    }
    
    if (!$password) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Keine Passwort angegeben.");
    }
    
    /* $response = $database->query("SELECT * FROM " . $settings->db_tblprefix . "users WHERE nickname = " . mySQLValue($nickname) .
		" OR mail = " . mySQLValue($mail));
	
	if (mysql_num_rows($response) != 0) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Ein Benutzer mit diesem Nicknamen bzw. dieser E-Mail-Adresse existiert " .
			"bereits.");
	} */
	
    /* $response = $database->query("INSERT INTO " . $settings->db_tblprefix . "users (nickname, firstname, surname, mail, password) VALUES(" .
		mySQLValue($nickname) . ", " . mySQLValue($firstname) . ", " .  mySQLValue($surname) . ", " .
		mySQLValue(md5($password)) . ", " .  mySQLValue($mail) . ")");
    
    if (!$response) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . mysql_error());
	} else { */
	
	try {
		mail($settings->adminmail, "Neuen Klassenbuchbenutzer hinzufügen", "$firstname $surname hat sich im " .
			"Klassenbuch unter dem Nicknamen \"$nickname\" angemeldet.\n\nE-Mail-Adresse: $mail\n" .
			"Passwort: " . md5($password), "From: " . $settings->mail . "\r\nX-Mailer: PHP/' . phpversion()");
	} catch(Exception $e) {
		return new JSONRPCErrorResponse("SERVER_ERROR", "Fehler beim E-Mailversand.");
	}
	
	return true;
}

function gallery_getalbums() {
    global $database;
	
	$settings = Settings::getInstance();
	
	$databaseResponse = $database->query("SELECT * FROM " . $settings->db_tblprefix . "gallery_albums");
	
    if (!$databaseResponse) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . mysql_error());
	}
	
    $albums = Array();
    
    while ($row = mysql_fetch_array($databaseResponse)) {
		$pictures = mysql_num_rows($database->query("SELECT * FROM " . $settings->db_tblprefix . "gallery_pictures WHERE " .
		"albumid = " . $row["id"]));
		
        $albums[] = Array(
            "id"          => (int)    $row["id"],
            "name"        => (string) $row["name"],
            "description" => (string) $row["description"],
            "pictures"	  => (int)	  $pictures);
    }
	
    return $albums;
}

function gallery_createalbum($name, $description = "") {
    global $database;
    
    $user = User::getInstance();
	$settings = Settings::getInstance();
	
	$name = trim(smartStripSlashes($name));
	$description = trim(smartStripSlashes($description));
	
    if (!$user->authenticated) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");	
	}
	
    if (!$name) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Keinen Albumnamen angegeben");
    }
    
    if (!$database->query("INSERT INTO " . $settings->db_tblprefix . "gallery_albums (name, description, date) VALUES(" .
		mySQLValue($name) . ", " . mySQLValue($description) . ", " . time() . ")")) {
		return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . mysql_error());
	}
	
	return mysql_insert_id();
}

function gallery_removealbum($id) {
	global $database;
	
	$user = User::getInstance();
	$settings = Settings::getInstance();
	
	$id = intval($id);
	
    if (!$user->authenticated) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
    
    if ($id <= 0) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein gültiges Album angegeben");
    }
    
    $database->query("DELETE FROM " . $settings->db_tblprefix . "gallery_albums WHERE id = " . mySQLValue($id));
	
    return true;
}

function gallery_downloadalbum($albumid) {
	global $database;
	
	$user = User::getInstance();
	$settings = Settings::getInstance();
	
	$albumid = intval($albumid);
    
    if ($albumid <= 0) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein gültiges Album angegeben");
    }
    
    $response = $database->query("SELECT * FROM " . $settings->db_tblprefix . "gallery_albums WHERE id = " . mySQLValue($albumid));
    
    if (!$response) {
		return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "\nMySQL-Fehlermeldung: " . mysql_error());
    }
    
    if (mysql_num_rows($response) !== 1) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein gültiges Album angegeben");
    }
    
    $album = mysql_fetch_array($response);
    $fileName = "files/" . sanitizeFilename(strtolower($album["name"])) . ".zip";
    
    if (!file_exists($fileName) || (file_exists($fileName) && mysql_num_rows(
		$database->query("SELECT * FROM " . $settings->db_tblprefix . "gallery_pictures WHERE albumid = " .
		mySQLValue($albumid) . " AND submitted > " . mySQLValue(filemtime($fileName)))) > 0)) {
		if (file_exists($fileName)) {
			unlink($fileName);
		}
		
		$zippedFile = new zip_file($fileName);
		$zippedFile->set_options(array("inmemory" => 0, "recurse" => 0, "storepaths" => 0, "overwrite" => 0, "level" => 0)); 
		
		$response = $database->query("SELECT * FROM " . $settings->db_tblprefix . "gallery_pictures WHERE albumid = " .
			mySQLValue($albumid));
		
		if (!$response) {
			return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . mysql_error());
		}
		
		while ($picture = mysql_fetch_array($response)) {
			$zippedFile->add_files("gallery/originals/" . $picture["filename"]);
		}
		
		if ($zippedFile->create_archive() === 0) {
			return new JSONRPCErrorResponse("SERVER_ERROR", "Archiv konnte nicht erstellt werden");
		}
	}
    
	return $fileName;
}

function gallery_getpictures($albumid) {
	global $database;
	
	$settings = Settings::getInstance();
	
	$albumid = intval($albumid);
    
    if (!$albumid) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein gültiges Album");    
    }
    
    $databaseResponse = $database->query("SELECT * FROM " . $settings->db_tblprefix . "gallery_pictures WHERE albumid = " .
		mySQLValue($albumid) . " ORDER BY taken ASC");
    
	if (!$databaseResponse) {
		return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . mysql_error());
	}
	
    $pictures = Array();
    
    while ($row = mysql_fetch_array($databaseResponse)) {
        $pictures[] = Array(
            "id"          => (int)    $row["id"],
            "filename"    => (string) $row["filename"],
            "caption"     => (string) $row["caption"],
            "userid"      => (int)	  $row["userid"],
            "submitted"   => (int)	  $row["submitted"],
            "taken"   	  => (int)	  $row["taken"]);
    }
	
    return $pictures;
}

function gallery_uploadpicture($albumid) {
	global $database;
	
	$user = User::getInstance();
	$settings = Settings::getInstance();
	
    if (!$user->authenticated) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
    
    $albumid = intval($albumid);
    
    if (!$albumid)
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein gültiges Album");
    
    if ($_FILES["Filedata"]) {
		$allowedExtensions = array("jpg", "bmp", "gif", "png");
		
        $fnParts = parseFileName(sanitizeFileName(utf8_decode($_FILES["Filedata"]["name"])));
        $fnPartsNew = $fnParts;
		
        $size = $_FILES["Filedata"]["size"];
		
        if ($size != 0 && in_array($fnParts["ext"], $allowedExtensions)) {
			if (mysql_num_rows($database->query("SELECT id FROM " . $settings->db_tblprefix . "gallery_albums WHERE id = " .
				mySQLValue($albumid))) == 1) {
				$i = 1;
				while (is_file("gallery/originals/" . $fnPartsNew["base"] . "." . $fnPartsNew["ext"])) {
					$fnPartsNew["base"] = $fnParts["base"] . "_(" . ++$i .")";
				}
				
				$newFileName = $fnPartsNew["base"] . "." . $fnPartsNew["ext"];
				
				if (move_uploaded_file($_FILES["Filedata"]["tmp_name"], "gallery/originals/$newFileName")) {
					$exifData = exif_read_data("gallery/originals/$newFileName", 0, true);
					$takenRaw = $exifData["EXIF"]["DateTimeOriginal"];
					
					$taken = mktime(
						intval(substr($takenRaw, 11, 2)),
						intval(substr($takenRaw, 14, 2)),
						intval(substr($takenRaw, 17, 2)),
						intval(substr($takenRaw, 5, 2)),
						intval(substr($takenRaw, 8, 2)),
						intval(substr($takenRaw, 0, 4))
					);
					
					$retval = gallery_generatethumbnails($newFileName);
					
					if ($retval !== true) {
						unlink("gallery/originals/$newFileName");
						return $retval;
					}
					
					chmod("gallery/originals/$newFileName",  0644);
					
					if ($database->query("INSERT INTO " . $settings->db_tblprefix . "gallery_pictures (filename, " .
						"albumid, userid, submitted, taken) VALUES(" . mySQLValue($newFileName) . ", " .
						mySQLValue($albumid) . ", " . $user->id . ", " . time() . ", " . mySQLValue($taken) . ")")) {
						return mysql_insert_id();
					} else {
						return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . mysql_error());
					}
				} else {
					return new JSONRPCErrorResponse("SERVER_ERROR");
				}
            } else {
                return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein gültiges Album");
            }
        } else {
            return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Entweder eine 0-Byte-Datei oder nicht unterstütztes Format");
        }
    } else {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein Foto hochgeladen");
    }
}

function gallery_rotatepicture($pictureid, $degree) {
	global $database;
	
	$user = User::getInstance();
	$settings = Settings::getInstance();
	
    $pictureid = intval($pictureid);
    $degree = intval($degree);

    if (!$user->authenticated) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
    
    if ($degree % 90 != 0) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein gültiger Winkel angegeben.");
    }
    
    $response = $database->query("SELECT * FROM " . $settings->db_tblprefix . "gallery_pictures WHERE id = " .
		mySQLValue($pictureid));
    
    if (mysql_num_rows($response) != 1) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein gültiges Bild angegeben.");
    }
    
    $picture = mysql_fetch_array($response);
	
    if (!($user->isadmin || $picture["userid"] == $user->id)) {
		return new JSONRPCErrorResponse("AUTHENTICATION_FAILED", "Fotos dürfen nur von demjenigen Benutzer bearbeitet werden, " .
			"der das betreffende Foto hochgeladen hat. Ansonsten hat nur der Administrator das Recht dazu.");
    }
    
    if (!function_exists("gd_info")) {
		return new JSONRPCErrorResponse("SERVER_ERROR", "Der Server nicht über eine benötigte Grafikbibliothek zu verfügen.");
    }
    
    $path = "gallery/originals/" . $picture["filename"];
	
	$source = imagecreatefromjpeg($path);
	$rotated = imagerotate($source, $degree, 0);
	imagejpeg($rotated, $path, 85);
	imagedestroy($rotated);
	
	gallery_generatethumbnails($picture["filename"]);
	
	return true;
}

function gallery_generatethumbnails($fileName) {
	$phpThumb = new phpThumb();
	
	$phpThumb->src = "gallery/originals/$fileName";
	$phpThumb->w = 120;
	$phpThumb->h = 90;
	$phpThumb->q = 85;
	
	if (!$phpThumb->GenerateThumbnail() || !$phpThumb->RenderToFile("gallery/thumbnails/$fileName")) {
		if (strpos(implode(",", $phpThumb->debugmessages), "Source image is too large")) {
			return new JSONRPCErrorResponse("SERVER_ERROR", "Das Bild ist zu gross. Bitte zuerst verkleinern.");
		}
		
		return new JSONRPCErrorResponse("SERVER_ERROR", "Miniaturansicht konnte nicht erstellt werden");
	}
	
	$phpThumb2 = new phpThumb();
	
	$phpThumb2->src = "gallery/originals/$fileName";
	$phpThumb2->w = 640;
	$phpThumb2->h = 480;
	$phpThumb->q = 85;
	
	if (!$phpThumb2->GenerateThumbnail() || !$phpThumb2->RenderToFile("gallery/pictures/$fileName")) {
		return new JSONRPCErrorResponse("SERVER_ERROR", "Diashow-Version des Fotos konnte nicht erstellt werden");
	}
		
	// Setzt die Zugriffsrechte
	chmod("gallery/pictures/$fileName",   0644);
	chmod("gallery/thumbnails/$fileName", 0644);
	
	return true;
}

// Die Dispatch Map für diesen Webservice: In ihr enthalten sind die Namen aller Methoden, die dieser Service bereitstellt.
// Zusätzlich enthält sie Angaben darüber, welche Parameter die bestimmten Methoden erwarten. 
// Eine kurze Beschreibung aller Methoden ist ebenfalls enthalten.
$dispatchMap = Array(
    "gettasks" => Array(
        "function"  => "gettasks",
        "signature" => Array(Array("array"), Array("array", "int"), Array("array", "int", "int")),
        "docstring" => "Gibt die Hausaufgaben für einen bestimmten Zeitraum aus. Standardmässig werden alle " .
					   "anstehenden Aufgaben zurückgegeben.",
    ),
	
    "removetask" => Array(
        "function"  => "removetask",
        "signature" => Array(Array("boolean", "int")),
        "docstring" => "Markiert eine bestimmte Aufgabe im Klassenbuch als entfernt, löscht sie also nicht endgültig aus" .
					   "der Datenbank."
    ),
    
    "createtask" => Array(
        "function"  => "createtask",
        "signature" => Array(Array("int", "string", "int", "string"), Array("int", "string", "int", "string", "boolean")),
        "docstring" => "Trägt eine Aufgabe in die Datenbank ein und gibt die ID der Aufgabe zurück."
    ),
    
    "edittask" => Array(
        "function"  => "edittask",
        "signature" => Array(Array("boolean", "int", "int", "string"), Array("boolean", "int", "int", "string", "boolean")),
        "docstring" => "Bearbeitet eine bestehende Aufgabe. Dabei kann nur das Datum, der Aufgabetext und die " .
					   "Wichtigkeit verändert werden."
    ),
    
    "getcomments" => Array(
        "function"  => "getcomments",
        "signature" => Array(Array("array", "int")),
        "docstring" => "Gibt die Kommentare zu einer bestimmten Aufgabe an und markiert die Kommentare als gelesen, wenn" .
					   "der Benutzer angemeldet ist."
    ),
    
    "createcomment" => Array(
        "function"  => "createcomment",
        "signature" => Array(Array("int", "int", "string")),
        "docstring" => "Erstellt einen neuen Kommentar zu einer bestimmten Aufgabe und gibt die ID des Kommentars zurück."
    ),
	
    "editcomment" => Array(
        "function"  => "editcomment",
        "signature" => Array(Array("boolean", "int", "string")),
        "docstring" => "Bearbeitet einen bestimmten Kommentar."
    ),
	
    "getcontacts" => Array(
        "function"  => "getcontacts",
        "signature" => Array(Array("array")),
        "docstring" => "Gibt eine Liste aller Kontakte aus. Wenn der Benutzer nicht angemeldet ist, werden die Felder " .
					   "mit persönlichen Informationen nicht übertragen."
    ),
    
    "getfiles" => Array(
        "function"  => "getfiles",
        "signature" => Array(Array("array")),
        "docstring" => "Gibt eine Liste der Dateien in der Dateiablage aus."
    ),
	
    "archivefile" => Array(
        "function"  => "archivefile",
        "signature" => Array(Array("boolean", "int")),
        "docstring" => "Markiert eine bestimmte Datei in der Dateiablage als archiviert."
    ),
	
    "uploadfile" => Array(
        "function"  => "uploadfile",
        "signature" => Array(Array("array", "string")),
        "docstring" => "Lädt eine beliebige Datei in die Dateiablage hoch und gibt die ID und der endgültige Name der " .
					   "Datei zurück."
    ),
	
    "signin" => Array(
        "function"  => "signin",
        "signature" => Array(Array("array", "string", "string")),
        "docstring" => "Erkennt einen Benutzer anhand eines eingegebenen Passworts und meldet ihn beim Klassenbuch an. " .
					   "Zusätzlich werden Informationen über den Benutzer zurückgegeben."
    ),

    "requestpassword" => Array(
        "function"  => "requestpassword",
        "signature" => Array(Array("boolean", "string", "string")),
        "docstring" => "Wenn der Benutzer sein Passwort vergessen hat, kann er mit dieser Funktion sein Bestehendes " .
					   "ändern. Er gibt seinen Benutzernamen und ein neues Passwort nach Wahl ein und erhält dann eine " .
					   "E-Mail mit einem Bestätigungslink."
    ),

    "verifynewpassword" => Array(
        "function"  => "verifynewpassword",
        "signature" => Array(Array("boolean", "string")),
        "docstring" => "Bestätigt ein neu angefordertes Passwort mit Hilfe des Bestätigungs-Schlüssels."
    ),
    
    "changepassword" => Array(
        "function"  => "changepassword",
        "signature" => Array(Array("boolean", "string", "string")),
        "docstring" => "Ändert das Passwort des aktuell angemeldeten Benutzers. Aus Sicherheitsgründen muss das alte " .
					   "Passwort ebenfalls angegeben werden."
    ),
	
    "getuserdata" => Array(
        "function"  => "getuserdata",
        "signature" => Array(Array("array")),
        "docstring" => "Wenn der Benutzer angemeldet ist, können mit dieser Methode benutzerspezifische Informationen " .
					   "und zusätzlich auch die aktuell gültige Session-ID abgerufen werden."
    ),
    
    "updateuserprofile" => Array(
        "function"  => "updateuserprofile",
        "signature" => Array(Array("boolean", "array")),
        "docstring" => "Verändert das Profil des angemeldeten Benutzers."
    ),
    
    "changeusersettings" => Array(
        "function"  => "changeusersettings",
        "signature" => Array(Array("boolean", "array")),
        "docstring" => "Verändert die Einstellungen des angemeldeten Benutzers. Wenn eine bestimmte Einstellung bereits " .
					   "vorhanden ist, wird sie durch die neue überschrieben und falls eine Einstellung noch nicht " .
					   "vorhanden ist, wird diese hinzugefügt."
    ),
    
    "signout" => Array(
        "function"  => "signout",
        "signature" => Array(Array("boolean")),
        "docstring" => "Meldet einen Benutzer vom Klassenbuch ab, indem es die Session und alles was dazu gehört löscht."
    ),
    
    "registeruser" => Array(
        "function"  => "registeruser",
        "signature" => Array(Array("boolean", "string", "string", "string", "string", "string")),
        "docstring" => "Ermöglicht es einem Benutzer, ein neues Konto beim Klassenbuch zu erstellen. Dazu muss er " .
					   "lediglich einen Nicknamen, Vor- und Nachnamen, eine gültige E-Mail-Adresse und ein Passwort " .
					   "angegeben. Die restlichen Profildaten kann er dann selber eintragen. Der Verwalter des " .
					   "Klassenbuchs erhält daraufhin eine E-Mail mit diesen Informationen, welche er dann noch in die " .
					   "Datenbank eintragen muss"
    ),
    
    "gallery_getalbums" => Array(
        "function"  => "gallery_getalbums",
        "signature" => Array(Array("array")),
        "docstring" => "Gibt eine Liste aller Alben in der Fotogalerie aus. Die Ausgabe enthält auch Informationen " .
					   "über die Anzahl Fotos in diesem Album."
	),
	
    "gallery_createalbum" => Array(
        "function"  => "gallery_createalbum",
        "signature" => Array(Array("int", "string"), Array("int", "string", "string")),
        "docstring" => "Erstellt ein neues Album in der Fotogalerie. Ein Name muss zwingend angegeben werden, während " .
					   "eine kurze Beschreibung optional ist."
	),  
    
    "gallery_removealbum" => Array(
        "function"  => "gallery_removealbum",
        "signature" => Array(Array("boolean", "int")),
        "docstring" => "Löscht ein Album komplett aus der Fotogalerie. Bei diesem Vorgang werden auch alle im Album " .
					   "enthaltenen Fotos gelöscht."
    ),
    
    "gallery_downloadalbum" => Array(
        "function"  => "gallery_downloadalbum",
        "signature" => Array(Array("string", "int")),
        "docstring" => "Erstellt aus allen Originalfotos in einem einzelnen Album ein mit Datum versehenes ZIP-Archiv " .
					   "im 'files'-Verzeichnis. Die Funktion gibt im Erfolgsfall den Namen der Datei zurück."
    ),
    
    "gallery_getpictures" => Array(
        "function"  => "gallery_getpictures",
        "signature" => Array(Array("array", "int")),
        "docstring" => "Gibt eine Liste aller Fotos in einem bestimmten Album aus."
    ),
    
    "gallery_uploadpicture" => Array(
        "function"  => "gallery_uploadpicture",
        "signature" => Array(Array("int", "int")),
        "docstring" => "Lädt ein Bild zum Server hoch und legt es in einem bestimmten Album ab."),
        
    
    "gallery_rotatepicture" => Array(
        "function"  => "gallery_rotatepicture",
        "signature" => Array(Array("boolean", "int", "int")),
        "docstring" => "Ermöglicht es, ein Foto in der Fotogalerie um einen bestimmten Winkel zu drehen. Erlaubt sind " .
					   "nur Vielfache von 90°. Diese Aktion kann nur vom Administrator, oder von demjenigen Benutzer, " .
					   "der das Foto hochgeladen hat, durchgeführt werden.")
);

$service = new JSONRPCService($dispatchMap, false);
$service->response_charset_encoding = "UTF-8";

if ($_POST["jsonrpc"]) {
 	$service->service(strip_tags(stripcslashes($_POST["jsonrpc"])), true);
} elseif (!(defined("INTERNAL_REQUEST") && INTERNAL_REQUEST)) {
    $service->service(null, true);
}

function doInternalRequest($method = "", $params = Array()) {
    global $service;
    
    $json = new Services_JSON();
	return $service->service($json->encode(Array(
		"method" => $method,
		"params" => $params
    )), false);
}

?>