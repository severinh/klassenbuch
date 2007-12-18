<?php

// Der Zugriff auf die Daten des Klassenbuch erfolgt über diese Datei
define("_KBSECURE", true);

require_once("core.php");

Core::import("includes.jsonrpc.service");

// Selbst definierte Fehlermeldungen
JSONRPCErrorCodes::add("AUTHENTICATION_FAILED",  800, "Authentifizierung fehlgeschlagen");
JSONRPCErrorCodes::add("INVALID_DATABASE_QUERY", 801, "Ungültige Datenbankabfrage");

function gettasks($start = null, $end = null) {
	$database = Core::getDatabase();
	$user = Core::getUser();
    
	if ($start == null) {
        $start = mktime(0, 0, 0);
    }
	
	if ($end) {
        $cond = " AND t.date < " . $database->quote($end);
	}
	
	$database->setQuery("SELECT t.*, COUNT(c.userid) AS comments" .
		($user->authenticated() ? ", FIND_IN_SET(" . $database->quote($user->id) . ", t.commentsreadby) AS commentsread " : " ") .
		"FROM #__tasks AS t LEFT JOIN #__comments AS c ON t.id = c.taskid " .
		"WHERE t.date >= " . $database->quote($start) . $cond . " GROUP BY t.id ORDER BY t.date");
	
	$taskResponse = $database->loadAssocList();
	
	if (!$database->success()) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . $database->getErrorMsg());
    }
	
	$tasks = Array();
	
	foreach ($taskResponse as $task) {
        $tasks[] = Array(
            "id"          => (int)    $task["id"],
            "date"        => (int)    $task["date"],
            "subject"     => (int) 	  $task["subject"],
            "important"   => (bool)   $task["important"],
            "text"        => (string) $task["text"],
            "userid"      => (int)    $task["userid"],
            "added"       => (int)    $task["added"],
            "removed"     => (bool)   $task["removed"],
			"comments"	  => (int)    $task["comments"],
			"newcomments" => ($user->authenticated() && (int) $task["comments"] && !(bool) $task["commentsread"] ? true : false),
        );
    }
	
    return $tasks;
}

function removetask($taskid) {
    $user = Core::getUser();
    
    if (!$user->authenticated()) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
	}
	
	$task = Table::getInstance("tasks");
	
	if (!$task->load($taskid)) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", $task->getError());
	}
	
	if (!$task->save(Array("removed" => true))) {
		return new JSONRPCErrorResponse("SERVER_ERROR", $task->getError());
	}
	
	$subject = getsubject($task->subject);
	
	shoutbox_say_system("hat die " . $subject["short"] . "-Aufgabe \"" . $task->text . "\" gelöscht.");
	
    return true;
}

function createtask($subject, $date, $text, $important = false) {
	$user = Core::getUser();
	
    if (!$user->authenticated()) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
	
	$task = Table::getInstance("tasks");
	
	if (!$task->save(Array(
		"date" 		=> $date,
		"subject" 	=> $subject,
		"text" 		=> $text,
		"important" => $important,
		"userid" 	=> $user->id,
		"added" 	=> time()))) {
		return new JSONRPCErrorResponse("SERVER_ERROR", $task->getError());
	}
	
	$subject = getsubject($task->subject);
	
	shoutbox_say_system("hat eine neue " . $subject["short"] . "-Aufgabe für den " . localizedDate("j. F", $task->date) .
		" eingetragen:[BR /]\"" . $task->text . "\"");
    
    return $task->id;
}

function edittask($id, $date, $text, $important = false) {
	$user = Core::getUser();
	
    if (!$user->authenticated()) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
	
	$task = Table::getInstance("tasks");
	
	if (!$task->load($id)) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", $task->getError());
	}
	
	if (!$task->save(Array("date" => $date, "text" => $text, "important" => $important))) {
		return new JSONRPCErrorResponse("SERVER_ERROR", $task->getError());
	}
	
	return true;
}

function getsubjects() {
	$database = Core::getDatabase();
	
	$database->setQuery("SELECT * FROM #__subjects");
	$subjectsResponse = $database->loadAssocList();
	
    if (!$database->success()) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . $database->getErrorMsg());
	}
	
	$subjects = Array();
	
	foreach ($subjectsResponse as $subject) {
        $subjects[] = Array(
            "id"    => (int)    $subject["id"],
            "long"  => (string) $subject["long"],
            "short" => (string) $subject["short"]
		);
	}
	
	return $subjects;
}

function getsubject($id) {
	$subject = Table::getInstance("subjects");
	
	if (!$subject->load($id)) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", $subject->getError());
	}
 
	return Array(
		"id" 	=> (int) 	$subject->id,
		"long"  => (string) $subject->long,
		"short" => (string) $subject->short
	);
}

function getcomments($taskid) {
    $database = Core::getDatabase();
    $user = Core::getUser();
    
    if (!$user->authenticated()) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
	}
	
	$task = Table::getInstance("tasks");
	
	if (!$task->load($taskid)) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", $task->getError());
	}
	
	$readBy = explode(",", $task->commentsreadby);
	
	if (!in_array($user->id, $readBy)) {
		array_push($readBy, $user->id);
		
		if (!$task->save(Array("commentsreadby" => implode(",", $readBy)))) {
			return new JSONRPCErrorResponse("SERVER_ERROR", $task->getError());
		}
	}
	
    $database->setQuery("SELECT * FROM #__comments WHERE taskid = " . $database->quote($taskid) . " ORDER BY date");
    
	$commentsResponse = $database->loadAssocList();
	
    if (!$database->success()) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . $database->getErrorMsg());
	}
	
    $comments = Array();
    
	foreach ($commentsResponse as $comment) {
        $comments[] = Array(
            "id"     => (int)    $comment["id"],
            "taskid" => (int)    $comment["taskid"],
            "userid" => (int)    $comment["userid"],
            "date"   => (int)    $comment["date"],
            "text"   => (string) $comment["comment"]
		);
	}
	
    return $comments;
}

function createcomment($taskid, $text) {
	$user = Core::getUser();
	
    if (!$user->authenticated()) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
	}
	
	$task = Table::getInstance("tasks");
	
	if (!$task->load($taskid)) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", $task->getError());
	}
	
	if ($task->date < mktime(0, 0, 0)) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Aufgaben in der Vergangenheit können leider nicht mehr kommentiert werden.");
	}
	
	$comment = Table::getInstance("comments");
	
	if (!$comment->save(Array("taskid" => $task->id, "userid" => $user->id, "date" => time(), "comment" => $text))) {
		return new JSONRPCErrorResponse("SERVER_ERROR", $comment->getError());
	}
	
	$task->save(Array("commentsreadby" => $user->id));
    $user->save(Array("posts" => $user->posts + 1));
	
    return $comment->id;
}

function editcomment($id, $text) {
	$user = Core::getUser();
	
    if (!$user->authenticated()) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
	}
	
	$comment = Table::getInstance("comments");
	
	if (!$comment->load($id)) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", $comment->getError());
	}
	
	if ($comment->userid != $user->id) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Du darfst diesen Kommentar nicht bearbeiten.");
	}
	
	if (!$comment->save(Array("comment" => $text))) {
		return new JSONRPCErrorResponse("SERVER_ERROR", $comment->getError());
	}
	
	return true;
}

function getcontacts() {
    $database = Core::getDatabase();
    $user = Core::getUser();
    
    $database->setQuery("SELECT u.*, COUNT(t.userid) AS tasks FROM #__users AS u LEFT JOIN #__tasks AS t ON u.id = t.userid GROUP BY u.id");
	
    $contactsResponse = $database->loadAssocList();
	
    if (!$database->success()) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . $database->getErrorMsg());
    }
	
    $contacts = Array();
    
	foreach ($contactsResponse as $contact) {
		$lastcontact = (double) $contact["lastcontact"];
		$state 		 = (int) 	$contact["state"];
		
		if ($lastcontact < time() - 100) {
			$state = 0;
		}
		
        $contacts[] = Array(
            "id"          => (int)    $contact["id"],
            "firstname"   => (string) $contact["firstname"],
            "surname"     => (string) $contact["surname"],
            "nickname"    => (string) $contact["nickname"],
            "mail"        => (string) ($user->authenticated()) ? $contact["mail"]     : (($contact["mail"])     ? "hidden" : ""),
            "address"     => (string) ($user->authenticated()) ? $contact["address"]  : (($contact["address"])  ? "hidden" : ""),
            "plz"         => (int)    ($user->authenticated()) ? $contact["plz"]      : 0,
            "location"    => (string) ($user->authenticated()) ? $contact["location"] : (($contact["location"]) ? "hidden" : ""),
            "phone"       => (string) ($user->authenticated()) ? $contact["phone"]    : (($contact["phone"])    ? "hidden" : ""),
            "mobile"      => (string) ($user->authenticated()) ? $contact["mobile"]   : (($contact["mobile"])   ? "hidden" : ""),
            "mainsubject" => (string) $contact["mainsubject"],
            "posts"       => (int)    $contact["posts"],
			"tasks"		  => (int)    $contact["tasks"],
            "classmember" => (bool)   $contact["classmember"],
            "lastcontact" => $lastcontact,
			"state"		  => $state
		);
	}
    
    return $contacts;
}

function getfiles() {
    $database = Core::getDatabase();
	
    $database->setQuery("SELECT * FROM #__files ORDER BY uploaded");
    $filesResponse = $database->loadAssocList();
	
    if (!$database->success()) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . $database->getErrorMsg());
    }
    
    $files = Array();
    
	foreach ($filesResponse as $file) {
		if ((bool) $file["forcedarchiving"] || time() - (int) $file["uploaded"] >= 2592000) {
			$archived = true;
		} else {
			$archived = false;
		}
		
        $files[] = Array(
            "id"          => (int)    $file["id"],
            "name"        => (string) $file["name"],
            "description" => (string) $file["description"],
            "size"        => (int)    $file["size"],
            "userid"      => (int)    $file["userid"],
            "uploaded"    => (int)    $file["uploaded"],
            "archived"	  => $archived
		);
	}
    
    return $files;
}

function archivefile($id) {
	$user = Core::getUser();
	
    if (!$user->authenticated()) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
	
	$file = Table::getInstance("files");
	
	if (!$file->load($id)) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", $file->getError());
	}
	
	if ($file->userid !== $user->id) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Du darfst diese Datei leider nicht archivieren. " .
			"Dies ist dem Benutzer vorbehalten, der die Datei hochgeladen hat.");
	}
	
	if (!$file->save(Array("forcedarchiving" => true))) {
		return new JSONRPCErrorResponse("SERVER_ERROR", $file->getError());
	}
	
	shoutbox_say_system("hat die Datei \"" . $file->name . "\" archiviert.");
	
	return true;
}

function uploadfile($description) {
	$user = Core::getUser();
	$settings = Core::getSettings();
	
    if (!$user->authenticated()) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
    
    if (!$_FILES["Filedata"]) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Keine Datei hochgeladen");
	}
	
	$fnParts = parseFileName(utf8_decode(sanitizeFileName($_FILES["Filedata"]["name"])));
	
	if (in_array(strtolower($fnParts["ext"]), $settings->get("upload_extblacklist"))) {
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
	
	if (!move_uploaded_file($_FILES["Filedata"]["tmp_name"], "files/" . $newFileName)) {
		return new JSONRPCErrorResponse("SERVER_ERROR");
	}
	
	$file = Table::getInstance("files");
	
	if (!$file->save(Array(
		"name" 			=> $newFileName,
		"description" 	=> $description,
		"size" 			=> $fileSize,
		"userid" 		=> $user->id,
		"uploaded" 		=> time()))) {
		return new JSONRPCErrorResponse("SERVER_ERROR", $file->getError());
	}
	
	shoutbox_say_system("hat die Datei \"" . $newFileName . "\" hochgeladen.");
	
	return Array("id" => $file->id, "filename" => $file->name);
}

function signin($nickname, $password) {
	$user = Core::getUser();
	
    if (!$user->signIn($nickname, $password)) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
    
    return getuserdata();
}

function requestpassword($username, $password) {
    $database = Core::getDatabase();
	$settings = Core::getSettings();
	
    if (!$username) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Keinen Benutzernamen angegeben.");
    }
    
    if (!$password) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein Passwort angegeben.");    
    }
    
    $database->setQuery("SELECT * FROM #__users WHERE nickname = " . $database->quote($username));
	$user = $database->loadAssoc();
    
    if (!$database->success()) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . $database->getErrorMsg());
	}
	
    if ($database->getNumRows() != 1) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Benutzer existiert nicht.");
	}
	
    $requestKey = generateRandomString();
    
	$database->setQuery("UPDATE #__users SET " .
		"newpassword = " 	. $database->quote(md5($password)) . ", " .
		"newpasswordkey = " . $database->quote($requestKey) . " WHERE " .
		"nickname = " 		. $database->quote($username)
	);
	
    if (!$database->query()) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . $database->getErrorMsg());
    }
    
    if (!mail($user["mail"], "Neues Klassenbuchpasswort bestätigen",
		"Hallo " . $user["firstname"] . ",\n\n" .
        "Du hast im Klassenbuch ein neues Passwort angefordert. Klicke auf den foldenden Link, " .
        "damit dein Passwort endgültig auf \"$password\" gewechselt wird. Wenn du kein Passwort angefordert hast, " .
        "solltest du nicht auf diesen Link klicken, sondern diese E-Mail gleich löschen!\n\n" .
        $settings->get("domain") . "index.php?passwordverification=$requestKey",
        "From: Klassenbuch <" . $settings->get("mail") . ">")) {
        return new JSONRPCErrorResponse("SERVER_ERROR");
    }
    
    return true;
}

function verifynewpassword($key) {
    $database = Core::getDatabase();
	
    if (!$key) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein Bestätigungsschlussel angegeben");
    }
    
    $database->setQuery("SELECT * FROM #__users WHERE newpasswordkey = " . $database->quote($key));
	$user = $database->loadAssoc();
    
    if (!$database->success()) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . $database->getErrorMsg());
    }
    
    if ($database->getNumRows() != 1) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Ungültiger Bestätigungsschlüssel.");
    }
	
	$database->setQuery("UPDATE #__users SET " .
		"password = " . $database->quote($user["newpassword"]) . ", " .
		"newpasswordkey = '', " .
		"newpassword = '' WHERE " .
		"id = " 	  . $database->quote($user["id"])
	);
	
    if (!$database->query()) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . $database->getErrorMsg());
    }
    
    return true;
}

function changepassword($newpassword, $currentpassword) {
	$user = Core::getUser();
	
    if (!$user->authenticated()) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
    
    if (!$newpassword || !$currentpassword || md5($currentpassword) !== $user->password) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS");
	}
	
	if (!$user->save(Array("password" => md5($newpassword)))) {
		return new JSONRPCErrorResponse("SERVER_ERROR", $comment->getError());
	};
	
    return true;
}

function getuserdata() {
	$user = Core::getUser();

    if (!$user->authenticated()) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
    
    return Array(
		"id" 		=> $user->id,
		"nickname" 	=> $user->nickname,
		"token" 	=> $user->token,
		"profile" 	=> $user->getProfile(),
		"settings"	=> $user->getSettings(),
		"isadmin" 	=> $user->isadmin
    );
}

function updateuserprofile($profileInformation) {
	$user = Core::getUser();
	
    if (!$user->authenticated()) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
    
    if (!$user->updateProfile($profileInformation)) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", $user->getError());
    }
    
	return true;
}

function changeusersettings($settings) {
	$user = Core::getUser();
	
    if (!$user->authenticated()) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
    
    $currentSettings = $user->getSettings();
	
    foreach ($settings as $key => $value) {
		$currentSettings[$key] = $value;
	}
	
	if (!$user->save(Array("settings" => $currentSettings))) {
		return new JSONRPCErrorResponse("SERVER_ERROR", $user->getError());
	}
	
	return true;
}

function setuserstate($state) {
	$user = Core::getUser();
	
    if (!$user->authenticated()) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
	
	if ($state == User::OFFLINE || $state == User::AWAY || $state == User::ONLINE) {
		return $user->setState($state);
	} else {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein gültiger Status angegeben.");
	}
}

function signout() {
    $user = Core::getUser();
    
    return $user->signOut();
}

function registeruser($nickname, $firstname, $surname, $mail, $password) {
	$database = Core::getDatabase();
	$settings = Core::getSettings();
	
	$nickname  = trim(strip_tags($nickname));
	$firstname = trim(strip_tags($firstname));
	$surname   = trim(strip_tags($surname));
	$mail 	   = trim(strip_tags($mail));
	
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
    
    /* $database->setQuery("SELECT * FROM #__users WHERE nickname = " . $database->quote($nickname) . " OR mail = " .
		$database->quote($mail));
	$response = $database->query();
	
	if ($database->getNumRows() != 0) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Ein Benutzer mit diesem Nicknamen bzw. dieser E-Mail-Adresse existiert " .
			"bereits.");
	} */
	
    /* $database->setQuery("INSERT INTO #__users (nickname, firstname, surname, mail, password) VALUES(" .
		$database->quote($nickname) . ", " . $database->quote($firstname) . ", " .  $database->quote($surname) . ", " .
		$database->quote(md5($password)) . ", " .  $database->quote($mail) . ")");
	
	$response = $database->query();
    if (!$response) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . $database->getErrorMsg());
	} else { */
	
	try {
		mail($settings->get("adminmail"), "Neuen Klassenbuchbenutzer hinzufügen", $firstname . " " . $surname .
			"hat sich im  Klassenbuch unter dem Nicknamen \"" . $nickname . "\" angemeldet.\n\n" .
			"E-Mail-Adresse: " . $mail . "\n" . "Passwort: " . md5($password),
			"From: " . $settings->get("mail") . "\r\nX-Mailer: PHP/' . phpversion()");
	} catch(Exception $e) {
		return new JSONRPCErrorResponse("SERVER_ERROR", "Fehler beim E-Mailversand.");
	}
	
	return true;
}

function gallery_getalbums() {
    $database = Core::getDatabase();
	
	$database->setQuery("SELECT a.*, COUNT(p.albumid) AS pictures FROM #__gallery_albums AS a LEFT JOIN #__gallery_pictures AS p ON a.id = p.albumid GROUP BY a.id");
	$albumsResponse = $database->loadAssocList();
	
    if (!$database->success()) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . $database->getErrorMsg());
	}
	
    $albums = Array();
    
	foreach ($albumsResponse as $album) {
        $albums[] = Array(
            "id"          => (int)    $album["id"],
            "name"        => (string) $album["name"],
            "description" => (string) $album["description"],
            "pictures"	  => (int)	  $album["pictures"]
		);
	}
	
    return $albums;
}

function gallery_createalbum($name, $description = "") {
	$user = Core::getUser();
	
    if (!$user->authenticated()) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");	
	}
	
	$album = Table::getInstance("albums");
	
	if (!$album->save(Array(
		"name" => $name,
		"description" => $description,
		"date" => time()))) {
		return new JSONRPCErrorResponse("SERVER_ERROR", $album->getError());
	}
	
	shoutbox_say_system("hat das Fotoalbum \"" . $name . "\" hinzugefügt.");
	
	return $album->id;
}

function gallery_removealbum($id) {
	$user = Core::getUser();
	
    if (!$user->authenticated()) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
    
	$albumTable = Table::getInstance("albums");
	
	if (!$albumTable->delete($id)) {
		return new JSONRPCErrorResponse("SERVER_ERROR", $album->getError());
	}
	
	shoutbox_say_system("hat das Fotoalbum " . $name . " gelöscht.");
	
	return true;
}

function gallery_downloadalbum($albumid) {
	$database = Core::getDatabase();
	$user = Core::getUser();
    
	$album = Table::getInstance("albums");
	
	if (!$album->load($albumid)) {
		return new JSONRPCErrorResponse("SERVER_ERROR", $album->getError());
	}
    
    $fileName = "files/" . sanitizeFilename(strtolower($album->name)) . ".zip";
	$rebuild = true;
	
	if (file_exists($fileName)) {
		$database->setQuery("SELECT * FROM #__gallery_pictures WHERE " .
			"albumid = "   . $database->quote($albumid) . " AND " .
			"submitted > " . $database->quote(filemtime($fileName))
		);
		
		if ($database->getNumRows($database->query()) == 0) {
			$rebuild = false;
		}
	}
	
	if ($rebuild) {
		if (file_exists($fileName)) {
			unlink($fileName);
		}
		
		Core::import("includes.compression");
		
		$zippedFile = new zip_file($fileName);
		$zippedFile->set_options(array("inmemory" => 0, "recurse" => 0, "storepaths" => 0, "overwrite" => 0, "level" => 0)); 
		
		$database->setQuery("SELECT * FROM #__gallery_pictures WHERE albumid = " . $database->quote($albumid));
		$pictures = $database->loadAssocList();
		
		if (!$database->success()) {
			return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . $database->getErrorMsg());
		}
		
		foreach ($pictures as $picture) {
			$zippedFile->add_files("gallery/originals/" . $picture["filename"]);
		}
		
		if ($zippedFile->create_archive() === 0) {
			return new JSONRPCErrorResponse("SERVER_ERROR", "Archiv konnte nicht erstellt werden");
		}
	}
	
	return $fileName;
}

function gallery_getpictures($albumid) {
	$database = Core::getDatabase();
    
	$album = Table::getInstance("albums");
	
	if (!$album->load($albumid)) {
		return new JSONRPCErrorResponse("SERVER_ERROR", $album->getError());
	}
    
    $database->setQuery("SELECT * FROM #__gallery_pictures WHERE albumid = " . $database->quote($albumid) .
		" ORDER BY taken ASC");
	
	$picturesResponse = $database->loadAssocList();
    
	if (!$database->success()) {
		return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . $database->getErrorMsg());
	}
	
    $pictures = Array();
    
	foreach ($picturesResponse as $picture) {
        $pictures[] = Array(
            "id"          => (int)    $picture["id"],
            "filename"    => (string) $picture["filename"],
            "caption"     => (string) $picture["caption"],
            "userid"      => (int)	  $picture["userid"],
            "submitted"   => (int)	  $picture["submitted"],
            "taken"   	  => (int)	  $picture["taken"]);
	}
	
    return $pictures;
}

function gallery_uploadpicture($albumid) {
	$user = Core::getUser();
	$database = Core::getDatabase();
	
    if (!$user->authenticated()) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
    
	$album = Table::getInstance("albums");
	
	if (!$album->load($albumid)) {
		return new JSONRPCErrorResponse("SERVER_ERROR", $album->getError());
	}
	
    if (!$_FILES["Filedata"]) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein Foto hochgeladen");
    }
	
	$allowedExtensions = Array("jpg", "bmp", "gif", "png");
	
	$fnParts = parseFileName(sanitizeFileName(utf8_decode($_FILES["Filedata"]["name"])));
	$fnPartsNew = $fnParts;
	
	$size = $_FILES["Filedata"]["size"];
	
	if ($size == 0) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Eine 0-Byte-Datei");
	}
	
	if (!in_array($fnParts["ext"], $allowedExtensions)) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Nicht unterstützter Dateityp.");
	}
	
	$i = 1;
	
	while (is_file("gallery/originals/" . $fnPartsNew["base"] . "." . $fnPartsNew["ext"])) {
		$fnPartsNew["base"] = $fnParts["base"] . "_(" . ++$i .")";
	}
	
	$newFileName = $fnPartsNew["base"] . "." . $fnPartsNew["ext"];
	
	if (!move_uploaded_file($_FILES["Filedata"]["tmp_name"], "gallery/originals/" . $newFileName)) {
		return new JSONRPCErrorResponse("SERVER_ERROR");
	}
	
	$exifData = exif_read_data("gallery/originals/" . $newFileName, 0, true);
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
		unlink("gallery/originals/" . $newFileName);
		return $retval;
	}
	
	chmod("gallery/originals/" . $newFileName,  0644);
	
	$database->setQuery("SELECT * FROM #__gallery_pictures WHERE " .
		"userid = " . $database->quote($user->id) . " AND " .
		"albumid = " . $database->quote($albumid) . " AND " .
		"submitted > " . $database->quote(time() - 15)
	);
	
	if (!$database->getNumRows($database->query())) {
		shoutbox_say_system("lädt neue Fotos ins Album \"" . $album->name . "\".");
	}
	
	$picture = Table::getInstance("pictures");
	
	if ($picture->save(Array(
		"filename" 	=> $newFileName,
		"albumid" 	=> $albumid,
		"userid" 	=> $user->id,
		"submitted" => time(),
		"taken" 	=> $taken))) {
		return $picture->id;
	} else {
		return new JSONRPCErrorResponse("SERVER_ERROR", $picture->getError());
	}
}

function gallery_rotatepicture($id, $degree) {
	$user = Core::getUser();
	
    if (!$user->authenticated()) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
	
    if (!$id) {
        return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein gültiges Bild angegeben.");
    }
    
    if ($degree % 90 != 0) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein gültiger Winkel angegeben.");
    }
    
	$picture = Table::getInstance("pictures");
	
	if (!$picture->load($id)) {
		return new JSONRPCErrorResponse("INCORRECT_PARAMS", "Kein gültiges Bild angegeben.");
	}
	
    if (!($user->isadmin || $picture->userid == $user->id)) {
		return new JSONRPCErrorResponse("AUTHENTICATION_FAILED", "Fotos dürfen nur von demjenigen Benutzer bearbeitet werden, " .
			"der das betreffende Foto hochgeladen hat. Ansonsten hat nur der Administrator das Recht dazu.");
    }
    
    if (!function_exists("gd_info")) {
		return new JSONRPCErrorResponse("SERVER_ERROR", "Der Server nicht über eine benötigte Grafikbibliothek zu verfügen.");
    }
    
    $path = "gallery/originals/" . $picture->filename;
	
	$source = imagecreatefromjpeg($path);
	$rotated = imagerotate($source, $degree, 0);
	imagejpeg($rotated, $path, 85);
	imagedestroy($rotated);
	
	gallery_generatethumbnails($picture->filename);
	
	return true;
}

function gallery_generatethumbnails($fileName) {
	Core::import("includes.phpthumb.phpthumb");
	
	$phpThumb = new phpThumb();
	
	$phpThumb->src = "gallery/originals/" . $fileName;
	$phpThumb->w = 120;
	$phpThumb->h = 90;
	$phpThumb->q = 85;
	
	if (!$phpThumb->GenerateThumbnail() || !$phpThumb->RenderToFile("gallery/thumbnails/" . $fileName)) {
		if (strpos(implode(",", $phpThumb->debugmessages), "Source image is too large")) {
			return new JSONRPCErrorResponse("SERVER_ERROR", "Das Bild ist zu gross. Bitte zuerst verkleinern.");
		}
		
		return new JSONRPCErrorResponse("SERVER_ERROR", "Miniaturansicht konnte nicht erstellt werden");
	}
	
	$phpThumb2 = new phpThumb();
	
	$phpThumb2->src = "gallery/originals/" . $fileName;
	$phpThumb2->w = 640;
	$phpThumb2->h = 480;
	$phpThumb->q = 85;
	
	if (!$phpThumb2->GenerateThumbnail() || !$phpThumb2->RenderToFile("gallery/pictures/" . $fileName)) {
		return new JSONRPCErrorResponse("SERVER_ERROR", "Diashow-Version des Fotos konnte nicht erstellt werden");
	}
		
	// Setzt die Zugriffsrechte
	chmod("gallery/pictures/"   . $fileName, 0644);
	chmod("gallery/thumbnails/" . $fileName, 0644);
	
	return true;
}

function shoutbox_poll($startAfter) {
	$database = Core::getDatabase();
	
	if ($startAfter) {
		$database->setQuery("SELECT * FROM #__messages WHERE id > " . $database->quote($startAfter));
	} else {
		$database->setQuery("SELECT * FROM #__messages ORDER BY id DESC LIMIT 100");
	}
	
	$messagesResponse = $database->loadAssocList();
	
    if (!$database->success()) {
        return new JSONRPCErrorResponse("INVALID_DATABASE_QUERY", "MySQL-Fehlermeldung: " . $database->getErrorMsg());
	}
	
    $messages = Array();
    
	foreach ($messagesResponse as $message) {
        $messages[] = Array(
            "id"     => (int)    $message["id"],
            "userid" => (int)    $message["userid"],
            "date"   => (int)    $message["date"],
            "text"   => (string) $message["text"],
			"system" => (bool)	 $message["system"]
		);
	}
	
	if (count($messages)) {
		$user = Core::getUser();
		
	    if (!$user->authenticated()) {
	        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
	    }
	}
	
	return array_reverse($messages);
};

function shoutbox_say($text, $startAfter, $system = false) {
	$user = Core::getUser();
	
    if (!$user->authenticated()) {
        return new JSONRPCErrorResponse("AUTHENTICATION_FAILED");
    }
	
	$message = Table::getInstance("messages");
	
	if (!$message->save(Array(
		"userid" => $user->id,
		"date" => time(),
		"text" => $text,
		"system" => $system))) {
		return new JSONRPCErrorResponse("SERVER_ERROR", $message->getError());
	}
    
	if ($startAfter) {
		return shoutbox_poll($startAfter);
	} else {
		return $message->id;
	}
}

// Used internally only
function shoutbox_say_system($text) {
	return shoutbox_say($text, 0, true);
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
        "signature" => Array(Array("int", "int", "int", "string"), Array("int", "int", "int", "string", "boolean")),
        "docstring" => "Trägt eine Aufgabe in die Datenbank ein und gibt die ID der Aufgabe zurück."
    ),
    
    "edittask" => Array(
        "function"  => "edittask",
        "signature" => Array(Array("boolean", "int", "int", "string"), Array("boolean", "int", "int", "string", "boolean")),
        "docstring" => "Bearbeitet eine bestehende Aufgabe. Dabei kann nur das Datum, der Aufgabetext und die " .
					   "Wichtigkeit verändert werden."
    ),
	
    "getsubjects" => Array(
        "function"  => "getsubjects",
        "signature" => Array(Array("array")),
        "docstring" => "Gibt eine Liste der Schulfächer zurück, die beim Eintragen von Aufgaben verwendet werden können."
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
	
    "setuserstate" => Array(
        "function"  => "setuserstate",
        "signature" => Array(Array("boolean", "int")),
        "docstring" => "Aktualisiert den Status des angemeldeten Benutzers. Der Status '1' bedeutet, dass der Benutzer " .
					   "abwesend ist, während '2' darauf schliessen lässt, dass der Benutzer online ist und gerade im " .
					   "Klassenbuch aktiv ist."
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
					   "der das Foto hochgeladen hat, durchgeführt werden."),
	
    "shoutbox_poll" => Array(
        "function"  => "shoutbox_poll",
        "signature" => Array(Array("array"), Array("array", "int")),
        "docstring" => "Gibt die aktuellen Nachrichten in der Shoutbox zurück. Standardmässig werden die letzten 100 " .
					   "Nachrichten übertragen, es ist jedoch auch möglich, alle Nachrichten zu erhalten, die neuer " .
					   "sind als eine bestimmte Nachricht."),
	
    "shoutbox_say" => Array(
        "function"  => "shoutbox_say",
        "signature" => Array(Array("array", "string"), Array("array", "string", "int")),
        "docstring" => "Trägt eine neue Nachricht in die Shoutbox ein. Falls zusätzlich ein Wert für den zweiten " .
					   "Parameter angegeben wird, gibt die Methode zusätzlich eine Auflistung der neuen Nachrichten " .
					   "zurück.")
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