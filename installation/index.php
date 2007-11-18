<?php

// Der Zugriff auf das Klassenbuch darf über diese Datei erfolgen
define("_KBSECURE", true);

// Fehlermeldungen ganz abschalten
error_reporting(0);

require_once("wizard.php");

// Wenn das Klassenbuch bereits konfiguriert wurde, wird die Installation abgebrochen
if (file_exists("../settings.php")) {
	header("Location: ../");
	exit();
}

class InstWiz_Intro extends Wizard {
	function init() {
		$this->setNext("license");
		$this->setPrev(null);
		$this->setTitle("Willkommen bei der Installation des Klassenbuchs");
	}

	function setPage() {
		$this->page = "<p>Bevor du das Klassenbuch verwenden kannst, muss es eingerichtet werden. " .
			"Der Installationsassistent wird dich durch die Installation leiten.</p>";
	}
}

class InstWiz_License extends Wizard {
	function init() {
		$this->setPrev("intro");
		$this->setNext("dbconfig");
		$this->setTitle("Lizenz");
	}

	function setPage() {
		$this->page = $this->readFile("license.html");
	}
}

class InstWiz_DbConfig extends Wizard {
	function init() {
		$this->setPrev("license");
		$this->setNext("dbcheck");
		$this->setTitle("Datenbank-Einstellungen");
		$this->setDefaults(Array("wiz_db_host" => "localhost", "wiz_db_tblprefix" => "kb_"));
	}

	function setPage() {
		$this->page = "<p>Alle Aufgaben, Kommentare usw. im Klassenbuch werden in einer MySQL-Datenbank " .
			"abgelegt. Deshalb werden die Zugangsdaten zur Datenbank benötigt.</p>" .
			"Gib den Hostnamen des Servers an, auf dem die Klassenbuch-Datenbank installiert werden soll. " .
			"Ferner wird der Name einer bereits existierenden Datenbank benötigt und der Benutzername und das Passwort " .
			"eines Datenbank-Benutzers, der über die Rechte zum Erstellen von Tabellen in dieser Datenbank verfügt.</p>" .
			
			"<h3>Basiseinstellungen</h3>" .
			"<table class=\"configTable\"><tr>" .
			"	<td>Hostname:<br />" .
			"	<input type=\"text\" name=\"wiz_db_host\" value=\"[*wiz_db_host*]\"></td>" .
			"	<td class=\"configHelp\">In der Regel <strong>localhost</strong>.</td>" .
			"</tr><tr>" .
			"	<td>Datenbankname:<br />" .
			"	<input type=\"text\" name=\"wiz_db_name\" value=\"[*wiz_db_name*]\"></td>" .
			"	<td class=\"configHelp\"> Einige Hoster erlauben nur eine Datenbank pro Webseite. Wenn das der Fall " .
			"	ist, benutzen Sie bitte die Tabellen-Präfix-Option unter den \"Erweiterten Einstellungen\".</td>" .
			"</tr><tr>" .
			"	<td>Benutzername:<br />" .
			"	<input type=\"text\" name=\"wiz_db_user\" value=\"[*wiz_db_user*]\"></td>" .
			"	<td class=\"configHelp\">Dieses kann der Standard-MySQL-Benutzername <strong>root</strong> sein, " .
			"	ein Benutzername, der vom Hoster erstellt wurde oder ein Name, den Sie selber gewählt haben.</td>" .
			"</tr><tr>" .
			"	<td>Passwort:<br />" .
			"	<input type=\"password\" name=\"wiz_db_password\" value=\"[*wiz_db_password*]\"></td>" .
			"	<td class=\"configHelp\">Für die Sicherheit der Klassenbuch-Daten ist die Eingabe eines Passworts" .
			"	obligatorisch. Das Datenbank-Passwort ist möglicherweise von Ihrem Hoster voreingestellt worden.</td>" .
			"</tr></table>" .
			
			"<h3>Erweiterte Einstellungen</h3>" .
			"<table class=\"configTable\"><tr>" .
			"	<td>Tabellenpräfix:<br />" .
			"	<input type=\"text\" name=\"wiz_db_tblprefix\" value=\"[*wiz_db_tblprefix*]\"></td>" .
			"	<td class=\"configHelp\">Das Tabellen-Präfix wird allen Tabellen vorangestellt und ist v. a. dann " .
				"nützlich, wenn sich in der Datenbank noch andere Tabellen befinden.</td>" .
			"</tr></table>";
	}
}

class InstWiz_DbCheck extends Wizard {
	var $diags;
	
	function init() {
		$this->setPrev("dbconfig");
	}
	
	function testDatabase() {
	$this->opendb(
		$this->getVar("wiz_db_host"),
		$this->getVar("wiz_db_name"),
		$this->getVar("wiz_db_user"),
		$this->getVar("wiz_db_password")
	);
	
	$this->diags = $this->checkdb();
	
	if	(
		!$this->diags["Connect"] ||
		!$this->diags["Create"] ||
		!$this->diags["Insert"] ||
		!$this->diags["Update"] ||
		!$this->diags["Select"] ||
		!$this->diags["Delete"] ||
		!$this->diags["Drop"]) {
		return false;
	}
	
	$this->importdb("schema.sql", "kb_", $this->getVar("wiz_db_tblprefix"));
	
	return true;
}
	
	function setPage() {
		if ($this->testDatabase()) {
			$this->setTitle("Datenbank erfolgreich eingerichtet");
			$this->setNext("general");
			
			$msg = "<p>Die Datenbank wurde erfolgreich eingerichtet. Klicke nun auf [Weiter], um mit der Installation " .
				"fortzufahren.</p>";
		} else {
			$this->setTitle("Fehler beim Einrichten der Datenbank");
			$this->setNext(null);
			
			$msg = "<p>Die Datenbankeinstellungen stimmen nicht. Bitte klicke auf [Zurück] und überprüfe deine " .
				"Eingaben.</p>" .
				"<h3>Detaillierte Ergebnisse</h3><table border=\"0\">";
			
			foreach ($this->diags as $action => $result) {
				$text = !$result ? "<td style=\"color: red;\">Fehlgeschlagen</td>" : "<td style=\"color: green;\">OK</td>";
				
				$msg .= "<tr><td>" . strtoupper($action) . "</td>$text</tr>";
			}
			
			$msg .= "</table>";
		}
		
		$this->page = $msg;
	}
}

class InstWiz_GeneralSettings extends Wizard {
	function init() {
		$this->setPrev("dbconfig");
		$this->setNext("finish");
		$this->setTitle("Allgemeine Einstellungen");
		
		$this->setDefaults(Array(
			"wiz_title" => "Klassenbuch",
			"wiz_subtitle" => "der Klasse x an der Schule y"
		));
	}
	
	function setPage() {
		$this->page = "<p></p>" .
			
			"<table class=\"configTable\"><tr>" .
			"	<td>Domain:<br />" .
			"	<input type=\"text\" name=\"wiz_domain\" value=\"[*wiz_domain*]\"></td>" .
			"	<td class=\"configHelp\">Der absolute Pfad zur Klassenbuch-Installation, inklusive \"http://\"." .
			"	Befindet sich das Klassenbuch in einem Unterordner auf dem Webserver, muss dieser auch angegeben "  .
			"	werden: z. B. <em>http://www.meineschule.ch/klasse1c/</em></td>" .
			"</tr><tr>" .
			"	<td>Mail-Adresse:<br />" .
			"	<input type=\"text\" name=\"wiz_mail\" value=\"[*wiz_mail*]\"></td>" .
			"	<td class=\"configHelp\">Die E-Mail-Adresse, von der alle E-Mails verschickt werden sollen. " .
			"	z. B. klasse1c@meineschule.ch</td>" .
			"</tr><tr>" .
			"	<td>Klassenbuch-Titel:<br />" .
			"	<input type=\"text\" name=\"wiz_title\" value=\"[*wiz_title*]\"></td>" .
			"</tr><tr>" .
			"	<td>Untertitel:<br />" .
			"	<input type=\"text\" name=\"wiz_subtitle\" value=\"[*wiz_subtitle*]\"></td>" .
			"	<td class=\"configHelp\">Wird gleich unterhalb des Klassenbuch-Titels angezeigt.</td>" .
			"</tr><tr>" .
			"	<td>Ihr Name:<br />" .
			"	<input type=\"text\" name=\"wiz_adminname\" value=\"[*wiz_adminname*]\"></td>" .
			"	<td class=\"configHelp\"></td>" .
			"</tr><tr>" .
			"	<td>Ihre E-Mailadresse:<br />" .
			"	<input type=\"text\" name=\"wiz_adminmail\" value=\"[*wiz_adminmail*]\"></td>" .
			"	<td class=\"configHelp\">An diese Adresse werden Benachrichtigungen über Kontoregistrierungen usw. " .
			"	gesendet.</td>" .
			"</tr></table>";
	}
}

class InstWiz_Finish extends Wizard {
	function init() {
		$this->setPrev(null);
		$this->setNext(null);
		$this->setTitle("Fertig!");
	}
	
	function setPage() {
		$settings = $this->readFile("../settings.default.php");
		$keys = Array("domain", "mail", "adminmail", "adminname", "title", "subtitle", "db_host", "db_name",
			"db_user", "db_password", "db_tblprefix");
		
		foreach ($keys as $key => $value) {
			$settings = str_replace("{" . $value . "}", $this->getVar("wiz_" . $value), $settings);
		}
		
		$this->writeFile("../settings.php", $settings);
		$this->page = "<p>Das Klassenbuch wurde erfolgreich eingerichtet. Du kannst das Klassenbuch nun zum ersten Mal " .
			"öffnen.</p><ul><li><a href=\"../index.php\">Zum Klassenbuch</a></li></ul>";
	}
}

class InstallationWizard extends Wizard {
	function init() {
		$splash = new InstWiz_Intro("intro");
		$this->addPage("intro", &$splash);
	}
}

$wizard = new InstallationWizard();

$license = new InstWiz_License("license");
$wizard->addPage("license", $license);

$dbconfig = new InstWiz_DbConfig("dbconfig");
$wizard->addPage("dbconfig", $dbconfig);

$dbcheck = new InstWiz_DbCheck("dbcheck");
$wizard->addPage("dbcheck", $dbcheck);

$general = new InstWiz_GeneralSettings("general");
$wizard->addPage("general", $general);

$finish = new InstWiz_Finish("finish");
$wizard->addPage("finish", $finish);

$wizard->display();

?>