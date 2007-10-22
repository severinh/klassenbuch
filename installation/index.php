<?php

// Der Zugriff auf das Klassenbuch darf über diese Datei erfolgen
define("_KBSECURE", true);

require_once("wizard.php");

// Wenn das Klassenbuch bereits konfiguriert wurde, wird die Installation abgebrochen
if (file_exists("../server.settings.php")) {
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
		$this->page = "<p>Gib den Hostnamen des Servers an, auf dem die Klassenbuch-Datenbank installiert werden soll. " .
			"Ferner wird der Name einer bereits existierenden Datenbank benötigt und der Benutzername und das Passwort " .
			"eines Datenbank-Benutzers, der über die Rechte zum Erstellen von Tabellen in dieser Datenbank verfügt.</p>" .
			"<p>Das Tabellen-Präfix wird allen Tabellen vorangestellt und ist v. a. dann nützlich, wenn sich in der " .
			"Datenbank noch andere Tabellen befinden.</p>" .
			
			"<h3>Basiseinstellungen</h3>" .
			"<table class=\"configTable\"><tr>" .
			"	<td>Hostname:<br />" .
			"	<input type=\"text\" name=\"wiz_db_host\" value=\"[*wiz_db_host*]\"></td>" .
			"	<td class=\"configHelp\">In der Regel <strong>localhost</strong>.</td>" .
			"</tr><tr>" .
			"	<td>Datenbankname:<br />" .
			"	<input type=\"text\" name=\"wiz_db_name\" value=\"[*wiz_db_name*]\"></td>" .
			"	<td class=\"configHelp\"> Einige Hoster erlauben nur eine Datenbank pro Webseite. Wenn das der Fall " .
			"	ist, benutzen Sie bitte die Tabellen-Präfix-Option unter den Erweiterten Einstellungen.</td>" .
			"</tr><tr>" .
			"	<td>Benutzername:<br />" .
			"	<input type=\"text\" name=\"wiz_db_user\" value=\"[*wiz_db_user*]\"></td>" .
			"	<td class=\"configHelp\">Dieses kann der Standard-MySQL-Benutzername <strong>root</strong> sein, " .
			"	ein Benutzername, der vom Hoster erstellt wurde oder ein Name, den Sie selber gewählt haben.</td>" .
			"</tr><tr>" .
			"	<td>Passwort:<br />" .
			"	<input type=\"password\" name=\"wiz_db_password\" value=\"[*wiz_db_password*]\"></td>" .
			"	<td class=\"configHelp\">Für die Sicherheit der Webseite ist die Verwendung eines MySQL-Zugangs " .
			"	obligatorisch. Dieses ist das gleiche Passwort für Ihre Datenbank. Dieses könnte von Ihrem Hoster " .
			"	voreingestellt sein.</td>" .
			"</tr></table>" .
			
			"<h3>Erweiterte Einstellungen</h3>" .
			"<table class=\"configTable\"><tr>" .
			"	<td>Tabellenpräfix:<br />" .
			"	<input type=\"text\" name=\"wiz_db_tblprefix\" value=\"[*wiz_db_tblprefix*]\"></td>" .
			"	<td class=\"configHelp\"></td>" .
			"</tr></table>";
	}
}

class InstWiz_DbCheck extends Wizard {
	function init() {
		$this->setPrev("dbconfig");
		$this->setNext("finish");
		$this->setTitle("Überprüfen der Datenbank-Einstellungen");
	}
	
	function action() {
		$this->displayProgress();
	}
	
	function setPage() {
		$this->opendb(
			$this->getVar("wiz_db_host"),
			$this->getVar("wiz_db_name"),
			$this->getVar("wiz_db_user"),
			$this->getVar("wiz_db_password")
		);
		
		$diags = $this->checkdb();
		
		$bSuccess = true;
		
		if	(
			!$diags["Connect"] ||
			!$diags["Create"] ||
			!$diags["Insert"] ||
			!$diags["Update"] ||
			!$diags["Select"] ||
			!$diags["Delete"] ||
			!$diags["Drop"]) {
			$bSuccess = false;
		}
	
		if ($bSuccess) {
			$this->importdb("schema.sql", "kb_", $this->getVar("wiz_db_tblprefix"));
			
			$msg = "Die Datenbank wurde erfolgreich eingerichtet. Klicke nun auf [Weiter], um mit der Installation " .
				"fortzufahren.</p>";
		} else {
			$msg = "<span style=\"color: red; font-weight: bold;\">Fehler!</span> - Die Datenbankeinstellungen stimmen " .
				"nicht.</p><p>Bitte klicke auf [Zurück] und überprüfe deine Eingaben.</p>";
			$this->setNext(null);
		}
		
		$msg .= "<h3>Detaillierte Ergebnisse</h3><table border=\"0\">";
		
		foreach ($diags as $action => $result) {
			$text = !$result ? "<td style=\"color: red;\">Fehlgeschlagen</td>" : "<td style=\"color: green;\">OK</td>";
			
			$msg .= "<tr><td>" . $action . "</td>$text</tr>";
		}
		
		$msg .= "</table>";
		
		$this->page = $msg;
	}
}

class InstWiz_Finish extends Wizard {
	function init() {
		$this->setPrev(null);
		$this->setNext(null);
		$this->setTitle("Fertig!");
	}
	
	function setPage() {
		$settings = $this->readFile("../server.settings.default.php");
		$keys = Array("db_host", "db_name", "db_user", "db_password", "db_tblprefix");
		
		foreach ($keys as $key => $value) {
			$settings = str_replace("{" . $value . "}", $this->getVar("wiz_" . $value), $settings);
		}
		
		$this->writeFile("../server.settings.php", $settings);
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

$finish = new InstWiz_Finish("finish");
$wizard->addPage("finish", $finish);

$wizard->display();

?>