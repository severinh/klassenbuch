<?php

// Auf diese Datei ist kein direkter Zugriff erlaubt.
defined("_KBSECURE") or die("Zugriff verweigert.");

class Settings {
	static $instance = null;
	
	public $online = true;
	
	public $cookieprefix = "kb_";
	public $adminmail = "{adminmail}";
	public $title = "{title}";
	public $subtitle = "{subtitle}";
	
	public $db_host = "{db_host}";
	public $db_name = "{db_name}";
	public $db_user = "{db_user}";
	public $db_password = "{db_password}";
	public $db_tblprefix= "{db_tblprefix}";
	
	public $upload_online = true;
	public $upload_extblacklist = Array("exe", "scr", "dll", "msi", "vbs", "bat", "com", "pif", "cmd");
	public $upload_maxsize = 10485760;
	
	static public function &getInstance() {
		if (!self::$instance) {
			self::$instance = new Settings();
		}
		
		return self::$instance;
	}
	
    private function __construct() {
		
    }
}

?>