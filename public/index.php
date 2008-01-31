<?php
/*
 * Klassenbuch
 * Copyright (C) 2006 - 2008 Severin Heiniger
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * To view the GNU General Public License visit
 * http://www.gnu.org/copyleft/gpl.html
 * or write to the Free Software Foundation, Inc.,
 * 59 Temple Place, Suite 330, Boston, MA  02111-1307 USA
*/

// Der Zugriff auf das Klassenbuch erfolgt über diese Datei.
define("_KBSECURE", true);

// Wenn das Klassenbuch noch nicht konfiguriert wurde, wird die Installation eingeleitet
if (!file_exists("settings.php") || filesize("settings.php") < 10) {
	header("Location: installation/index.php");
	exit();
}

// Soll in keinem Fall gecached werden
header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
header("Expires: Sun, 1 Jan 1995 00:00:00 GMT");    // Datum in der Vergangenheit

// Es handelt sich hier um eine serverinterne Abfrage
define("INTERNAL_REQUEST", true);

require_once("service.php");
Core::import("includes.template");

$settings = Core::getSettings();

$tmpl = new Template;
$tmpl->read_file("index.tmpl");

$designList = Array("default", "nonzero");

$tmpl->set_var("TITLE", $settings->get("title"));
$tmpl->set_var("SUBTITLE", $settings->get("subtitle"));
$tmpl->set_var("ADMINMAIL", $settings->get("adminmail"));
$tmpl->set_var("ADMINNAME", $settings->get("adminname"));

if (!$settings->get("online")) {
	$tmpl->set_var("SIMPLEMESSAGE", true);
	$tmpl->set_var("PAGETITLE", "Offline");
	$tmpl->set_var("SIMPLEMESSAGETITLE", "Das Klassenbuch ist offline");
	$tmpl->set_var("SIMPLEMESSAGEBODY", "<p>Das Klassenbuch ist auf Grund von Wartungsarbeiten zur Zeit nicht " .
		"erreichbar. Bitte versuche es später noch einmal. Vielen Dank für dein Verständnis.</p>");
} else {
	if ($_GET["passwordverification"]) {
		$tmpl->set_var("SIMPLEMESSAGE", true);
		
		$response = doInternalRequest("verifynewpassword", Array($_GET["passwordverification"]));
		
		if ($response->result) {
			$tmpl->set_var("PAGETITLE", "Passwort geändert");
			$tmpl->set_var("SIMPLEMESSAGETITLE", "Dein Passwort wurde erfolgreich geändert");
			$tmpl->set_var("SIMPLEMESSAGEBODY", "<p>Du hast die Passwortänderung nun bestätigt. Du kannst nun das " .
				"Klassenbuch aufrufen und dich mit deinem neuen Passwort anmelden.</p>" .
				"<ul><li><a href=\"" . $settings->get("domain") . "\">Klassenbuch öffnen</a></li></ul>");
		} else {
			$tmpl->set_var("PAGETITLE", "Fehler");
			$tmpl->set_var("SIMPLEMESSAGETITLE", "Es ist ein Fehler aufgetreten");
			$tmpl->set_var("SIMPLEMESSAGEBODY", "<p>Dein Passwort konnte leider nicht geändert werden, da der " .
				"Sicherheitsschlüssel im E-Mail-Link nicht (mehr) gültig ist. Bitte stell sicher, dass der richtige " .
				"Link in der Adresszeile des Browsers steht. Wende dich bei Fragen an Severin.</p>");
		}
	} else {
		$user = Core::getUser();
		
		$user->setState(User::ONLINE);
		
		$tmpl->set_var("SIMPLEMESSAGE", false);
		
		$directData = Array();
		
		$userData = doInternalRequest("getuserdata");
		$albums   = doInternalRequest("gallery_getalbums");
		$tasks    = doInternalRequest("gettasks", Array(mktime(0, 0, 0) - 2592000));
		$subjects = doInternalRequest("getsubjects");
		$contacts = doInternalRequest("getcontacts");
		$files    = doInternalRequest("getfiles");
		$albums   = doInternalRequest("gallery_getalbums");
		
		if ($userData->val) {
			$directData["userdata"] = $userData->payload;
			
			if ($userData->val["settings"] && in_array($userData->val["settings"]["theme"], $designList)) {
				$tmpl->set_var("DESIGN", $userData->val["settings"]["theme"]);
			}
		}
		
		if ($albums->val) {
			$directData["albums"] = $albums->payload;
		}
		
		if ($tasks->val) {
			$directData["tasks"] = $tasks->payload;
		}
		
		if ($subjects->val) {
			$directData["subjects"] = $subjects->payload;
		}
		
		if ($contacts->val) {
			$directData["contacts"] = $contacts->payload;
		}
		
		if ($files->val) {
			$directData["files"] = $files->payload;
		}
		
		$dataInsertion = "";
		
		foreach ($directData as $key => $value) {
			$dataInsertion .= "App.DirectData.set(\"" . $key . "\", " . $value . ");\n";
		}
		
		$tmpl->set_var("DIRECTDATA", $dataInsertion);
	}
}

$tmpl->parse();

echo $tmpl->get_template();

?>