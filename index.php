<?php

// Der Zugriff auf das Klassenbuch erfolgt über diese Datei.
define("_KBSECURE", true);

// Soll in keinem Fall gecached werden
header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
header("Expires: Sun, 1 Jan 1995 00:00:00 GMT");    // Datum in der Vergangenheit

// Es handelt sich hier um eine serverinterne Abfrage
define("INTERNAL_REQUEST", true);

require_once("server.service.php");
require_once("server.template.php");

$tmpl = new Template;
$tmpl->read_file("index.tmpl");

$designList = Array("default", "nonzero");

if (!$settings["gen"]["online"]) {
	$tmpl->set_var("SIMPLEMESSAGE", true);
	$tmpl->set_var("TITLE", "Offline");
	$tmpl->set_var("SIMPLEMESSAGETITLE", "Das Klassenbuch ist offline");
	$tmpl->set_var("SIMPLEMESSAGEBODY", "<p>Das Klassenbuch ist auf Grund von Wartungsarbeiten zur Zeit nicht " .
		"erreichbar. Bitte versuche es später noch einmal. Vielen Dank für dein Verständnis.</p>");
} else {
	if ($_GET["passwordverification"]) {
		$tmpl->set_var("SIMPLEMESSAGE", true);
		
		$response = doInternalRequest("verifynewpassword", Array($_GET["passwordverification"]));
		
		if ($response->result) {
			$tmpl->set_var("TITLE", "Passwort geändert");
			$tmpl->set_var("SIMPLEMESSAGETITLE", "Dein Passwort wurde erfolgreich geändert");
			$tmpl->set_var("SIMPLEMESSAGEBODY", "<p>Du hast die Passwortänderung nun bestätigt. Du kannst nun das " .
				"Klassenbuch aufrufen und dich mit deinem neuen Passwort anmelden.</p>" .
				"<ul><li><a href=\"http://www.gymo2c.ch\">Klassenbuch öffnen</a></li></ul>");
		} else {
			$tmpl->set_var("TITLE", "Fehler");
			$tmpl->set_var("SIMPLEMESSAGETITLE", "Es ist ein Fehler aufgetreten");
			$tmpl->set_var("SIMPLEMESSAGEBODY", "<p>Dein Passwort konnte leider nicht geändert werden, da der " .
				"Sicherheitsschlüssel im E-Mail-Link nicht (mehr) gültig ist. Bitte stell sicher, dass der richtige " .
				"Link in der Adresszeile des Browsers steht. Wende dich bei Fragen an Severin.</p>");
		}
	} else {
		$tmpl->set_var("SIMPLEMESSAGE", false);
		
		$directData = Array();
		
		$userData = doInternalRequest("getuserdata");
		$albums   = doInternalRequest("gallery_getalbums");
		$tasks 	  = doInternalRequest("gettasks", Array(mktime(0, 0, 0) - 2592000));
		$contacts = doInternalRequest("getcontacts");
		$files 	  = doInternalRequest("getfiles");
		$albums   = doInternalRequest("gallery_getalbums");
		
		if ($userData->result) {
			$directData[] = "userdata: " . $userData->raw;
			
			if ($userData->result->settings && in_array($userData->result->settings->theme, $designList)) {
				$tmpl->set_var("DESIGN", $userData->result->settings->theme);
			}
		}
		
		if ($albums->result) {
			$directData[] = "albums: " . $albums->raw;
		}
		
		if ($tasks->result) {
			$directData[] = "tasks: " . $tasks->raw;
		}
		
		if ($contacts->result) {
			$directData[] = "contacts: " . $contacts->raw;
		}
		
		if ($files->result) {
			$directData[] = "files: " . $files->raw;
		}
		
		$tmpl->set_var("DIRECTDATA", implode(",\n", $directData) . "\n");
	}
}

$tmpl->parse();

echo $tmpl->get_template();

?>