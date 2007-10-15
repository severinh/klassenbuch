<?php
// Auf diese Datei ist kein direkter Zugriff erlaubt.
defined("_KBSECURE") or die("Zugriff verweigert.");

require_once("server.settings.php");
require_once("server.database.php");
require_once("server.user.php");
require_once("server.jsonservice.php");

// Generische Klasse
class Singleton {
	static private $instances = Array();
	
	static public function getInstance($className) {
		if (!isset(self::$instances[$className])) {
		self::$instances[$className] = new $className();
		}
		
		return self::$instances[$className];
	}
}


$database = new DatabaseConnection();
$user = new User();
// $user &= User::getInstance();

function generateRandomString($size = 32) {
    $feed = "0123456789abcdefghijklmnopqrstuvwxyz";
    
    for ($i = 0; $i < $size; $i++)
        $rand_str .= substr($feed, rand(0, strlen($feed) - 1), 1);
    
    return $rand_str;
}

function smartStripSlashes($str) {
	if (get_magic_quotes_gpc()){
		return stripslashes($str);
	} else {
		return $str;
	}
}

// Source: http://www.plogger.org/
function sanitizeFileName($str) {
	return preg_replace("/[^\w|\.|'|\-|\[|\]]/", "_", $str);
}

function parseFileName($fileName) {
	$fileNameParts = explode(".", strrev($fileName), 2);
	
	return Array(
		"base" => strrev($fileNameParts[1]),
		"ext"  => strtolower(strrev($fileNameParts[0]))
	);
}

?>