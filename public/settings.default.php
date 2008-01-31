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