<?php

// Auf diese Datei ist kein direkter Zugriff erlaubt.
defined("_KBSECURE") or die("Zugriff verweigert.");

class DatabaseConnection {
	function DatabaseConnection() {
		$settings = Settings::getInstance();
		
		$this->connection = mysql_connect(
			$settings->db_host,
			$settings->db_user,
			$settings->db_password
		);
		
		if (!$this->connection) {
			die("Es konnte keine Verbindung zur Datenbank hergestellt werden.");
		}
		
		if (!mysql_select_db($settings->db_name, $this->connection)) {
			die("Die Datenbank konnte nicht ausgewählt werden.");
		}
	}
	
	function query($query) {
		return mysql_query($query, $this->connection);
	}
	
	function insertId() {
		return mysql_insert_id($this->connection);
	}
}

function mySQLValue($value) {
	if (get_magic_quotes_gpc()) {
		$value = stripslashes($value);
	}
	
	if (!is_numeric($value)) {
		$value = "'" . mysql_real_escape_string($value) . "'";
	}
	
	return $value;
}

?>