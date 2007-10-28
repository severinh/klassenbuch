<?php

// Der Zugriff auf die Daten des Klassenbuch erfolgt über diese Datei
define("_KBSECURE", true);

require_once("server.common.php");
require_once("server.xmlrpc.php");
require_once("server.xmlrpc.server.php");
require_once("server.jsonrpc.php");
require_once("server.jsonrpc.server.php");
require_once("server.xmlrpc.wrappers.php");
require_once("server.compression.php");
require_once("phpthumb/phpthumb.class.php");

// Übersetzung der von PHP-XMLRPC bereitgestellten Fehlermeldungen
$GLOBALS["xmlrpcstr"]["unknown_method"]   = "Unbekannte Methode";
$GLOBALS["xmlrpcstr"]["incorrect_params"] = utf8_decode("Unzulässige Parameter an die Methode übergeben");
$GLOBALS["xmlrpcstr"]["server_error"] 	  = "Interner Server-Fehler";

// Selbst definierte Fehlermeldungen
$usrErr = $GLOBALS["xmlrpcerruser"];

$GLOBALS["kbsvcerr"]["authentication_failed"]  = $usrErr;
$GLOBALS["kbsvcstr"]["authentication_failed"]  = "Authentifizierung fehlgeschlagen";
$GLOBALS["kbsvcerr"]["invalid_database_query"] = $usrErr + 1;
$GLOBALS["kbsvcstr"]["invalid_database_query"] = "Ungültige Datenbankabfrage";
$GLOBALS["kbsvcerr"]["invalid_input"] 		   = $usrErr + 2;
$GLOBALS["kbsvcstr"]["invalid_input"] 		   = "Ungültige Eingabewerte";
$GLOBALS["kbsvcerr"]["server_error"] 		   = $usrErr + 3;
$GLOBALS["kbsvcstr"]["server_error"] 		   = "Interner Server-Fehler";
$GLOBALS["kbsvcerr"]["user_not_found"] 		   = $usrErr + 4;
$GLOBALS["kbsvcstr"]["user_not_found"] 		   = "Der Benutzer konnte nicht gefunden werden";

function gettasks($start = 0, $end = 0) {
	global $database;
	
	$user = User::getInstance();
    
    // Wurde kein Beginn des Zeitrahmens angegeben, wird der aktuelle Tag eingesetzt
	if (!$start) {
        $start = mktime(0, 0, 0);
    }
    
    // Die Datenbankabfrage wird um die nötige Bedingung ergänzt, falls ein Ende des Zeitrahmens angegeben wurde
	if ($end != 0) {
        $cond = " AND date < " . mySQLValue($end);
	}
	
    $tasksResponse = $database->query("SELECT * FROM tasks WHERE date >= " . mySQLValue($start) . 
		"$cond ORDER BY date");
		
	if (!$tasksResponse) {
        return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
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
    
    $commentsResponse = $database->query("SELECT taskid, COUNT(*) AS numberofcomments FROM comments WHERE date >= " .
		mySQLValue($oldestSumbission) . " GROUP BY taskid");
    
	if (!$commentsResponse) {
        return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
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
    
    if (!$user->authenticated) {
        return WebServiceError("authentication_failed");
	}
	
    if (!$taskid) {
        return WebServiceError("invalid_input", ": Keine Aufgabe angegeben.");
    }
    
    if (!$database->query("UPDATE tasks SET removed = 1 WHERE id = " . mySQLValue($taskid))) {
        return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
    }
    
    if (mysql_affected_rows() != 1) {
        return WebServiceError("invalid_input", ": Eine Aufgabe mit der ID $taskid existiert nicht.");
	}
	
    return true;
}

function createtask($subject, $date, $text, $important = false) {
    global $database;
    
    $user = User::getInstance();
    
    // Prüft, ob der Benuzter angemeldet ist
    if (!$user->authenticated) {
        return WebServiceError("authentication_failed");
    }
    
    // Überprüft die Eingabewerte
    if (!$subject) {
        return WebServiceError("invalid_input", ": Kein Fach angegeben.");
    }
    
    if (!$date) {
        return WebServiceError("invalid_input", ": Kein Datum angegeben.");
    }
    
    if (!$text) {
        return WebServiceError("invalid_input", ": Keine Aufgabe angegeben.");
    }
    
    // Der aktuelle Timestamp
    $time = time();
    
    // Trägt die Aufgabe in die Datenbank ein
    if (!$database->query("INSERT INTO tasks (date, subject, text, important, userid, added) VALUES(" . mySQLValue($date) . ", " . 
        mySQLValue($subject) . ", " . mySQLValue($text) . ", " . mySQLValue($important) . ", " . $user->id . ", $time)")) {
        return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
    }
    
    return mysql_insert_id();
}

function edittask($id, $date, $text, $important = false) {
    global $database;
    
    $user = User::getInstance();
    
    // Prüft, ob der Benuzter angemeldet ist
    if (!$user->authenticated) {
        return WebServiceError("authentication_failed");
    }
    
    // Überprüft die Eingabewerte
    if ($id <= 0) {
        return WebServiceError("invalid_input", ": Keine gültige Aufgaben-ID angegeben.");
    }
    
    if (!$date) {
        return WebServiceError("invalid_input", ": Kein Datum angegeben.");
    }
    
    if (!$text) {
        return WebServiceError("invalid_input", ": Keine Aufgabe angegeben.");
    }
    
    if (!$database->query("UPDATE tasks SET date = " . mySQLValue($date) . ", text = " . mySQLValue($text) . ", important = " .
        mySQLValue($important) . " WHERE id = " . mySQLValue($id))) {
        return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
    }
    
    return true;
}

function getcomments($taskid) {
    global $database;
    
    $user = User::getInstance();
    
    $databaseResponse = $database->query("SELECT * FROM comments WHERE taskid = " . mySQLValue($taskid) . " ORDER BY date");
    
    if (!$databaseResponse) {
        return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
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
        $databaseResponse = $database->query("SELECT * FROM tasks WHERE id = " . mySQLValue($taskid));
        
        if ($databaseResponse) {
            $row = mysql_fetch_array($databaseResponse);
            $commentsReadBy = explode(",", $row["commentsreadby"]);
            
            if (!in_array($user->id, $commentsReadBy)) {
                array_push($commentsReadBy, $user->id);
                $database->query("UPDATE tasks SET commentsreadby = " . mySQLValue(implode(",", $commentsReadBy)) . " WHERE id = " . mySQLValue($taskid));
            }
        }
    }
    
    return $comments;
}

function createcomment($taskid, $text) {
    global $database;
    
    $user = User::getInstance();
    
    if (!$user->authenticated) {
        return WebServiceError("authentication_failed");
	}
	
    if (!$text) {
        return WebServiceError("invalid_input", ": Kein Kommentar angegeben.");
    }
    
    if (!$database->query("INSERT INTO comments (taskid, userid, date, comment) VALUES(" . mySQLValue($taskid) . ", " . mySQLValue($user->id) . 
		", " . mySQLValue(time()) . ", " . mySQLValue($text) . ")")) {
        return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
    }
    
    $id = mysql_insert_id();
    $database->query("UPDATE tasks SET commentsreadby = '," . mySQLValue($user->id) . "' WHERE id = " . mySQLValue($taskid));
    $user->update(Array("posts" => ($user->posts + 1)));

    return $id;
}

function editcomment($id, $text) {
    global $database;
    
    $user = User::getInstance();
    
    if (!$text) {
        return WebServiceError("invalid_input", ": Kein Kommentar angegeben.");
	}
	
    if (!$user->authenticated) {
        return WebServiceError("authentication_failed");
    }
    
    $databaseResponse = $database->query("UPDATE comments SET comment = " . mySQLValue($text) . " WHERE id = " .
		mySQLValue($id) . " AND userid = " . mySQLValue($user->id));
		
	if (!$databaseResponse) {
        return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
    }
    
    if (mysql_affected_rows() != 1) {
        return WebServiceError("invalid_input", ": Entweder existiert der Kommentar nicht oder du bist nicht " .
			"autorisiert, den Kommentar zu bearbeiten");
	}
    
    return true;
}

function getcontacts() {
    global $database;
    
    $user = User::getInstance();
    
    $databaseResponse = $database->query("SELECT * FROM users ORDER BY firstname");
    
    if (!$databaseResponse) {
        return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
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
    
    $databaseResponse = $database->query("SELECT * FROM files ORDER BY uploaded");
    
    if (!$databaseResponse) {
        return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
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
	
    if (!$user->authenticated) {
        return WebServiceError("authentication_failed");
    }
	
    $response = $database->query("SELECT * FROM files WHERE id = " . mySQLValue($id));
    
    if (!$response) {
        return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
	}
	
    if (mysql_num_rows($response) != 1) {
        return WebServiceError("invalid_input", ": Keine gültige Datei angegeben.");
    }
    
    $file = mysql_fetch_array($response);
	
    if ($file["userid"] != $user->id) {
		return WebServiceError("invalid_input", ": Du darfst diese Datei leider nicht archivieren. " .
			"Dies ist dem Benutzer vorbehalten, der die Datei hochgeladen hat.");
    }
    
    $response = $database->query("UPDATE files SET forcedarchiving = 1 WHERE id = " . mySQLValue($id));
    
    if (!$response) {
        return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
	}
	
	return true;
}

function uploadfile($description) {
	global $database;
	
	$user = User::getInstance();
	
	$settings = Settings::getInstance();
	
    if (!$user->authenticated) {
        return WebServiceError("authentication_failed");
    }
    
    if (!$description) {
        return WebServiceError("invalid_input", ": Keine Beschreibung eingegeben");    
    }
    
    if ($_FILES["Filedata"]) {
        $date = time();
        
        $fnParts = parseFileName(utf8_decode($_FILES["Filedata"]["name"]));
        
        if (in_array(strtolower($fnParts["ext"]), $settings->upload_extblacklist)) {
			return WebServiceError("invalid_input", ": Aus Sicherheitsgründen sind keine " . 
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
			if ($database->query("INSERT INTO files (name, description, size, userid, uploaded) VALUES(" . mySQLValue($newFileName) . ", " .
				mySQLValue($description) . ", $fileSize, " . $user->id . ", $date)")) {
				return mysql_insert_id();
			} else {
				return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
			}
		} else {
			return WebServiceError("server_error");
		}
    } else {
        return WebServiceError("invalid_input", ": Keine Datei hochgeladen");
    }
}

function signin($nickname, $password) {
	$user = User::getInstance();
    
    if (!$user->signIn($nickname, $password)) {
        return WebServiceError("authentication_failed");
    }
    
    return getuserdata();
}

function requestpassword($username, $password) {
    global $database;

    if (!$username) {
        return WebServiceError("invalid_input", ": Keinen Benutzernamen angegeben.");
    }
    
    if (!$password) {
        return WebServiceError("invalid_input", ": Kein Passwort angegeben.");    
    }
    
    $databaseResponse = $database->query("SELECT * FROM users WHERE nickname = " . mySQLValue($username));
    
    if (!$databaseResponse) {
        return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
	}
	
    if (mysql_num_rows($databaseResponse) != 1) {
        return WebServiceError("invalid_input", ": Benutzer existiert nicht.");
	}
	
    $user = mysql_fetch_array($databaseResponse);
    $requestKey = generateRandomString();
    
    if (!$database->query("UPDATE users SET newpassword = " . mySQLValue(md5($password)) . ", newpasswordkey = " . mySQLValue($requestKey) .
        " WHERE nickname = " . mySQLValue($username))) {
        return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
    }
    
    if (!mail($user["mail"], "Neues Klassenbuchpasswort bestätigen",
		"Hallo " . $user["firstname"] . ",\n\n" .
        "Du hast im Klassenbuch auf www.gymo1c.ch ein neues Passwort angefordert. Klicke auf den foldenden Link, " .
        "damit dein Passwort endgültig auf \"$password\" gewechselt wird. Wenn du kein Passwort angefordert hast, " .
        "solltest du nicht auf diesen Link klicken, sondern diese E-Mail gleich löschen!\n\n" .
        $settings->domain . "?passwordverification=$requestKey",
        "From: Klassenbuch <no-reply@gymo1c.ch>")) {
        return WebServiceError("invalid_input");
    }
    
    return true;
}

function verifynewpassword($key = "") {
    global $database;
    
    if (!$key) {
        return WebServiceError("invalid_input", ": Kein Bestätigungsschlussel angegeben");
    }
    
    $databaseResponse = $database->query("SELECT * FROM users WHERE newpasswordkey = " . mySQLValue($key));
    
    if (!$databaseResponse) {
        return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
    }
    
    if (mysql_num_rows($databaseResponse) != 1) {
        return WebServiceError("invalid_input", ": Ungültiger Bestätigungsschlüssel.");
    }
    
    $user = mysql_fetch_array($databaseResponse);    
    
    if (!$database->query("UPDATE users SET password = " . mySQLValue($user["newpassword"]) . ", newpasswordkey = '', newpassword = '' " .
        "WHERE id = " . mySQLValue($user["id"]))) {
        return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
    }
    
    return true;
}

function changepassword($newpassword, $currentpassword) {
	global $database;
	
	$user = User::getInstance();
	
    if (!$user->authenticated) {
        return WebServiceError("authentication_failed");
    }
    
    if (!$newpassword || !$currentpassword) {
		return WebServiceError("invalid_input");
	}
	
    $response = $database->query("UPDATE users SET password = " . mySQLValue(md5($newpassword)) .
		" WHERE password = " . mySQLValue(md5($currentpassword)) . " AND id = " . mySQLValue($user->id));
	
	if (!$response) {
		return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());	
    }
    
    if (mysql_affected_rows() != 1) {
		return WebServiceError("invalid_input", ": Falsches Passwort angegeben.");
    }
    
    return true;
}

function getuserdata() {
	$user = User::getInstance();

    if (!$user->authenticated) {
        return WebServiceError("authentication_failed");
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
        return WebServiceError("authentication_failed");
    }
    
    if (!$user->update($profileInformation)) {
        return WebServiceError("invalid_input");
    }
    
	return true;
}

function changeusersettings($settings) {
	$user = User::getInstance();
	
    if (!$user->authenticated) {
        return WebServiceError("authentication_failed");
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
        return WebServiceError("invalid_input", ": Kein Nickname angegeben.");
    }
    
    if (!$firstname) {
        return WebServiceError("invalid_input", ": Kein Vorname angegeben.");
    }
    
    if (!$surname) {
        return WebServiceError("invalid_input", ": Kein Nachname angegeben.");
    }
    
    if (!$mail) {
        return WebServiceError("invalid_input", ": Keine E-Mail-Adresse angegeben.");
    }
    
    if (!$password) {
        return WebServiceError("invalid_input", ": Keine Passwort angegeben.");
    }
    
    /* $response = $database->query("SELECT * FROM users WHERE nickname = " . mySQLValue($nickname) . " OR mail = " . 
		mySQLValue($mail));
	
	if (mysql_num_rows($response) != 0) {
		return WebServiceError("invalid_input", ": Ein Benutzer mit diesem Nicknamen bzw. dieser E-Mail-Adresse existiert " .
			"bereits.");
	} */
	
    /* $response = $database->query("INSERT INTO users (nickname, firstname, surname, mail, password) VALUES(" .
		mySQLValue($nickname) . ", " . mySQLValue($firstname) . ", " .  mySQLValue($surname) . ", " .
		mySQLValue(md5($password)) . ", " .  mySQLValue($mail) . ")");
    
    if (!$response) {
        return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
	} else { */
	
	try {
		mail($settings->adminmail, "Neuen Klassenbuchbenutzer hinzufügen", "$firstname $surname hat sich im " .
			"Klassenbuch unter dem Nicknamen \"$nickname\" angemeldet.\n\nE-Mail-Adresse: $mail\n" .
			"Passwort: " . md5($password), "From: usermanagement@gymo1c.ch\r\nX-Mailer: PHP/' . phpversion()");
	} catch(Exception $e) {
		return WebServiceError("server_error", ": Die E-Mail an Severin konnte nicht versandt werden.");
	}
	
	return true;
}

function gallery_getalbums() {
    global $database;

	$databaseResponse = $database->query("SELECT * FROM gallery_albums");
	
    if (!$databaseResponse) {
        return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
	}
	
    $albums = Array();
    
    while ($row = mysql_fetch_array($databaseResponse)) {
		$pictures = mysql_num_rows($database->query("SELECT * FROM gallery_pictures WHERE albumid = " . $row["id"]));
		
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
	
	$name = trim(smartStripSlashes($name));
	$description = trim(smartStripSlashes($description));
	
    if (!$user->authenticated) {
        return WebServiceError("authentication_failed");	
	}
	
    if (!$name) {
        return WebServiceError("invalid_input", ": Keinen Albumnamen angegeben");
    }
    
    if (!$database->query("INSERT INTO gallery_albums (name, description, date) VALUES(" . mySQLValue($name) . ", " . mySQLValue($description) . ", " . 
		time() . ")")) {
		return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
	}
	
	return mysql_insert_id();
}

function gallery_removealbum($id) {
	global $database;
	
	$user = User::getInstance();
	
	$id = intval($id);
	
    if (!$user->authenticated) {
        return WebServiceError("authentication_failed");
    }
    
    if ($id <= 0) {
		return WebServiceError("invalid_input", ": Kein gültiges Album angegeben");
    }
    
    $database->query("DELETE FROM gallery_albums WHERE id = " . mySQLValue($id));
	
    return true;
}

function gallery_downloadalbum($albumid) {
	global $database;
	
	$user = User::getInstance();
	
	$albumid = intval($albumid);
    
    if ($albumid <= 0) {
		return WebServiceError("invalid_input", ": Kein gültiges Album angegeben");
    }
    
    $response = $database->query("SELECT * FROM gallery_albums WHERE id = " . mySQLValue($albumid));
    
    if (!$response) {
		return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
    }
    
    if (mysql_num_rows($response) !== 1) {
		return WebServiceError("invalid_input", ": Kein gültiges Album angegeben");
    }
    
    $album = mysql_fetch_array($response);
    $fileName = "files/" . sanitizeFilename(strtolower($album["name"])) . ".zip";
    
    if (!file_exists($fileName) || (file_exists($fileName) && mysql_num_rows(
		$database->query("SELECT * FROM gallery_pictures WHERE albumid = " .
		mySQLValue($albumid) . " AND submitted > " . mySQLValue(filemtime($fileName)))) > 0)) {
		if (file_exists($fileName)) {
			unlink($fileName);
		}
		
		$zippedFile = new zip_file($fileName);
		$zippedFile->set_options(array("inmemory" => 0, "recurse" => 0, "storepaths" => 0, "overwrite" => 0, "level" => 0)); 
		
		$response = $database->query("SELECT * FROM gallery_pictures WHERE albumid = " . mySQLValue($albumid));
		
		if (!$response) {
			return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
		}
		
		while ($picture = mysql_fetch_array($response)) {
			$zippedFile->add_files("gallery/originals/" . $picture["filename"]);
		}
		
		if ($zippedFile->create_archive() === 0) {
			return WebServiceError("server_error", ": Archiv konnte nicht erstellt werden");
		}
	}
    
	return $fileName;
}

function gallery_getpictures($albumid) {
	global $database;
	
	$albumid = intval($albumid);
    
    if (!$albumid) {
        return WebServiceError("invalid_input", ": Kein gültiges Album");    
    }
    
    $databaseResponse = $database->query("SELECT * FROM gallery_pictures WHERE albumid = " . mySQLValue($albumid) . " ORDER BY taken ASC");
    
	if (!$databaseResponse) {
		return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
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
	
    if (!$user->authenticated) {
        return WebServiceError("authentication_failed");
    }
    
    $albumid = intval($albumid);
    
    if (!$albumid)
        return WebServiceError("invalid_input", ": Kein gültiges Album");
    
    if ($_FILES["Filedata"]) {
		$allowedExtensions = array("jpg", "bmp", "gif", "png");
		
        $fnParts = parseFileName(sanitizeFileName(utf8_decode($_FILES["Filedata"]["name"])));
        $fnPartsNew = $fnParts;
		
        $size = $_FILES["Filedata"]["size"];
		
        if ($size != 0 && in_array($fnParts["ext"], $allowedExtensions)) {
			if (mysql_num_rows($database->query("SELECT id FROM gallery_albums WHERE id = " . mySQLValue($albumid))) == 1) {
				$i = 1;
				while (is_file("files/" . $fnPartsNew["base"] . "." . $fnPartsNew["ext"])) {
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
					
					if ($database->query("INSERT INTO gallery_pictures (filename, albumid, userid, submitted, " .
						"taken) VALUES(" . mySQLValue($newFileName) . ", " . mySQLValue($albumid) . ", " . 
						$user->id . ", " . time() . ", " . mySQLValue($taken) . ")")) {
						return mysql_insert_id();
					} else {
						return WebServiceError("invalid_database_query", "\nMySQL-Fehlermeldung: " . mysql_error());
					}
				} else {
					return WebServiceError("server_error");
				}
            } else {
                return WebServiceError("invalid_input", ": Kein gültiges Album");
            }
        } else {
            return WebServiceError("invalid_input", ": Entweder eine 0-Byte-Datei oder nicht unterstütztes Format");
        }
    } else {
        return WebServiceError("invalid_input", ": Kein Foto hochgeladen");
    }
}

function gallery_rotatepicture($pictureid, $degree) {
	global $database;
	
	$user = User::getInstance();
	
    $pictureid = intval($pictureid);
    $degree = intval($degree);

    if (!$user->authenticated) {
        return WebServiceError("authentication_failed");
    }
    
    if ($degree % 90 != 0) {
		return WebServiceError("invalid_input", ": Kein gültiger Winkel angegeben.");
    }
    
    $response = $database->query("SELECT * FROM gallery_pictures WHERE id = " . mySQLValue($pictureid));
    
    if (mysql_num_rows($response) != 1) {
		return WebServiceError("invalid_input", ": Kein gültiges Bild angegeben.");
    }
    
    $picture = mysql_fetch_array($response);
	
    if (!($user->isadmin || $picture["userid"] == $user->id)) {
		return WebServiceError("authentication_failed", ": Fotos dürfen nur von demjenigen Benutzer bearbeitet werden, " .
			"der das betreffende Foto hochgeladen hat. Ansonsten hat nur der Administrator das Recht dazu.");
    }
    
    if (!function_exists("gd_info")) {
		return WebServiceError("server_error", "Der Server nicht über eine benötigte Grafikbibliothek zu verfügen.");
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
			return WebServiceError("server_error", ": Das Bild ist zu gross. Bitte zuerst verkleinern.");
		}
		
		return WebServiceError("server_error", ": Miniaturansicht konnte nicht erstellt werden");
	}
	
	$phpThumb2 = new phpThumb();
	
	$phpThumb2->src = "gallery/originals/$fileName";
	$phpThumb2->w = 640;
	$phpThumb2->h = 480;
	$phpThumb->q = 85;
	
	if (!$phpThumb2->GenerateThumbnail() || !$phpThumb2->RenderToFile("gallery/pictures/$fileName")) {
		return WebServiceError("server_error", ": Diashow-Version des Fotos konnte nicht erstellt werden");
	}
		
	// Setzt die Zugriffsrechte
	chmod("gallery/pictures/$fileName",   0644);
	chmod("gallery/thumbnails/$fileName", 0644);
	
	return true;
}

function WebServiceError($error, $addition = "") {
    return new xmlrpcresp(0, $GLOBALS["kbsvcerr"][$error], utf8_decode($GLOBALS["kbsvcstr"][$error] . $addition));
};

// Die Dispatch Map für diesen Webservice: In ihr enthalten sind die Namen aller Methoden, die dieser Service bereitstellt.
// Zusätzlich enthält sie Angaben darüber, welche Parameter die bestimmten Methoden erwarten. 
// Eine kurze Beschreibung aller Methoden ist ebenfalls enthalten.
// Siehe auch: http://phpxmlrpc.sourceforge.net/doc-2/ch07s05.html - 5.2. The dispatch map

// Die Methodensignaturen funktionieren momentan noch nicht wie gewünscht
$dispatchMap = array(
    "gettasks" => array(
        "function"  => "gettasks",
        "docstring" => "Gibt die Hausaufgaben für einen bestimmten Zeitraum aus. Standardmässig werden alle anstehenden " .
					   "Aufgaben zurückgegeben."
    ),

    "removetask" => array(
        "function"  => "removetask",
        "docstring" => "Markiert eine bestimmte Aufgabe im Klassenbuch als entfernt, löscht sie also nicht endgültig aus" .
					   "der Datenbank."
    ),
        
    "createtask" => array(
        "function"  => "createtask",
        "docstring" => "Trägt eine Aufgabe in die Datenbank ein."
    ),
        
    "edittask" => array(
        "function"  => "edittask",
        "docstring" => "Bearbeitet eine bestehende Aufgabe. Dabei kann nur das Datum, der Aufgabetext und die " .
					   "Wichtigkeit verändert werden."
    ),

    "getcomments" => array(
        "function"  => "getcomments",
        "docstring" => "Gibt die Kommentare zu einer bestimmten Aufgabe an und markiert die Kommentare als gelesen, wenn" .
					   "der Benutzer angemeldet ist."
    ),

    "createcomment" => array(
        "function"  => "createcomment",
        "docstring" => "Erstellt einen neuen Kommentar zu einer bestimmten Aufgabe."
    ),

    "editcomment" => array(
        "function"  => "editcomment",
        "docstring" => "Bearbeitet einen bestimmten Kommentar."
    ),

    "getcontacts" => array(
        "function"  => "getcontacts",
        "docstring" => "Gibt eine Liste aller Kontakte aus. Wenn der Benutzer nicht angemeldet ist, werden die Felder " .
					   "mit persönlichen Informationen nicht übertragen."
    ),
    
    "getfiles" => array(
        "function"  => "getfiles",
        "docstring" => "Gibt eine Liste der Dateien in der Dateiablage aus."
    ),
    
    "archivefile" => array(
        "function"  => "archivefile",
        "docstring" => "Markiert eine bestimmte Datei in der Dateiablage als \"archiviert\"."
    ),

    "uploadfile" => array(
        "function"  => "uploadfile",
        "docstring" => "Lädt eine beliebige Datei in die Dateiablage hoch."
    ),

    "signin" => array(
        "function"  => "signin",
        "docstring" => "Erkennt einen Benutzer anhand eines eingegebenen Passworts und meldet ihn beim Klassenbuch an. " .
					   "Zusätzlich werden Informationen über den Benutzer zurückgegeben."
    ),

    "requestpassword" => array(
        "function"  => "requestpassword",
        "docstring" => "Wenn der Benutzer sein Passwort vergessen hat, kann er mit dieser Funktion sein Bestehendes " .
					   "ändern. Er gibt seinen Benutzernamen und ein neues Passwort nach Wahl ein und erhält dann eine " .
					   "E-Mail mit einem Bestätigungslink."
    ),

    "verifynewpassword" => array(
        "function"  => "verifynewpassword",
        "docstring" => "Bestätigt ein neu angefordertes Passwort mit Hilfe des Bestätigungs-Schlüssels."
    ),
    
    "changepassword" => array(
        "function"  => "changepassword",
        "docstring" => "Ändert das Passwort des aktuell angemeldeten Benutzers. Aus Sicherheitsgründen muss das alte " .
					   "Passwort ebenfalls angegeben werden."
    ),

    "getuserdata" => array(
        "function"  => "getuserdata",
        "docstring" => "Wenn der Benutzer angemeldet ist, können mit dieser Methode benutzerspezifische Informationen " .
					   "und zusätzlich auch die aktuell gültige Session-ID abgerufen werden. Die Methode signin ruft " .
					   "diese Methode automatisch auf und gibt deren Ausgabe an den Client weiter."
    ),
    
    "updateuserprofile" => array(
        "function"  => "updateuserprofile",
        "docstring" => "Verändert das Profil des angemeldeten Benutzers."
    ),
    
    "changeusersettings" => array(
        "function"  => "changeusersettings",
        "docstring" => "Verändert die Einstellungen des angemeldeten Benutzers. Wenn eine bestimmte Einstellung bereits " .
					   "vorhanden ist, wird sie durch die neue überschrieben und falls eine Einstellung noch nicht " .
					   "vorhanden ist, wird diese hinzugefügt."
    ),
    
    "signout" => array(
        "function"  => "signout",
        "docstring" => "Meldet einen Benutzer vom Klassenbuch ab, indem es die Session und alles was dazugehört löscht."
    ),
    
    "registeruser" => array(
        "function"  => "registeruser",
        "docstring" => "Ermöglicht es einem Benutzer, ein neues Konto beim Klassenbuch zu erstellen. Dazu muss er " .
					   "lediglich einen Nicknamen, Vor- und Nachnamen, eine gültige E-Mail-Adresse und ein Passwort " .
					   "angegeben. Die restlichen Profildaten kann er dann selber eintragen. Der Verwalter des " .
					   "Klassenbuchs muss dann noch den Sperr-Hinweis vom Passwort-Feld in der Datenbank entfernen, " .
					   "damit der Benutzer unter seinem neuen Konto anmelden kann."
    ),
        
    "gallery_getalbums" => array(
        "function"  => "gallery_getalbums",
        "docstring" => "Gibt eine Liste aller Alben in der Fotogalerie aus. Die Datenausgabe enthält auch Informationen " .
					   "über die Anzahl Fotos in diesem Album."
	),        
        
    "gallery_createalbum" => array(
        "function"  => "gallery_createalbum",
        "docstring" => "Erstellt ein neues Album in der Fotogalerie. Ein Name muss zwingend angegeben werden, während " .
					   "eine kurze Beschreibung optional ist."
	),  
        
    "gallery_removealbum" => array(
        "function"  => "gallery_removealbum",
        "docstring" => "Löscht ein Album komplett aus der Fotogalerie. Bei diesem Vorgang werden auch alle im Album " .
					   "enthaltenen Fotos gelöscht."
    ),
    
    "gallery_downloadalbum" => array(
        "function"  => "gallery_downloadalbum",
        "docstring" => "Erstellt aus allen Originalfotos in einem einzelnen Album ein mit Datum versehenes ZIP-Archiv " .
					   "im 'files'-Verzeichnis. Die Funktion gibt im Erfolgsfall den Namen der Datei zurück."
    ),
    
    "gallery_getpictures" => array(
        "function"  => "gallery_getpictures",
        "docstring" => "Gibt eine Liste aller Fotos in einem bestimmten Album aus."
    ),
    
    "gallery_uploadpicture" => array(
        "function"  => "gallery_uploadpicture",
        "docstring" => "Lädt ein Bild zum Server hoch in ein bestimmtes Album."),
        
    
    "gallery_rotatepicture" => array(
        "function"  => "gallery_rotatepicture",
        "docstring" => "Ermöglicht es, ein Foto in der Fotogalerie um einen bestimmten Winkel zu drehen. Erlaubt sind " .
					   "nur Vielfache von 90°. Diese Aktion kann nur vom Administrator, oder von demjenigen Benutzer, " .
					   "der das Foto hochgeladen hat, durchgeführt werden.")
);

$service = new jsonrpc_server($dispatchMap, false);
$service->response_charset_encoding = "UTF-8";

// Dient der Vereinfachung des Codes. Die in der Dispatch Map registrierten Methoden müssen keine Objekte vom Typ "jsonrpcmsg" zurückgeben,
// sondern normale PHP-Werte.
// Siehe auch: http://phpxmlrpc.sourceforge.net/doc-2/ch07s05.html - 5.7. 'New style' servers
$service->functions_parameters_type = "phpvals";

if ($_POST["jsonrpc"]) {
 	$service->service(strip_tags(stripcslashes($_POST["jsonrpc"])));
} elseif (!(defined("INTERNAL_REQUEST") && INTERNAL_REQUEST)) {
    $service->service();
}

function doInternalRequest($method = "", $params = Array()) {
    global $service;
    
    $response = Array();
    
    $json = new Services_JSON();
    $rawData = $service->service($json->encode(Array(
		"method" => $method,
		"params" => $params
    )), true);
    
    $response = $json->decode($rawData);
    $response->raw = $rawData;
    
    return $response;
}

?>