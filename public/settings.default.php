<?php

// Auf diese Datei ist kein direkter Zugriff erlaubt.
defined("_KBSECURE") or die("Zugriff verweigert.");

class Settings {
	private $online = true;
	
	private $domain = "{domain}";
	private $mail = "{mail}";
	private $cookieprefix = "kb_";
	private $adminmail = "{adminmail}";
	private $adminname = "{adminname}";
	private $title = "{title}";
	private $subtitle = "{subtitle}";
	
	private $db_type = "mysql";
	private $db_host = "{db_host}";
	private $db_name = "{db_name}";
	private $db_user = "{db_user}";
	private $db_password = "{db_password}";
	private $db_tblprefix = "{db_tblprefix}";
	
	private $upload_online = true;
	private $upload_extblacklist = Array("exe", "scr", "dll", "msi", "vbs", "bat", "com", "pif", "cmd", "php");
	private $upload_maxsize = 10485760;
	
	static public function &getInstance() {
		static $instance;
		
		if (!$instance) {
			$instance = new Settings();
		}
		
		return $instance;
	}
	
    public function __construct() {
		
    }
	
	public function get($key) {
		return $this->$key;
	}
}

?>