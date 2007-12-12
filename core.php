<?php
/*
 * Klassenbuch
 * Core: Based on Joomla.Framework subpackage Factory.
 * Copyright (C) 2006 - 2007 Severin Heiniger
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

defined("_KBSECURE") or die("Access denied.");

define("DS", DIRECTORY_SEPARATOR);

class Core {
	static public function &getUser() {
		Core::import("includes.user");
		
		return User::getInstance();
	}
	
	static public function &getSettings() {
		Core::import("settings");
		
		return Settings::getInstance();
	}
	
	static public function &getDatabase() {
		static $instance;
		
		if (!is_object($instance)) {
			$instance = self::_createDatabase();
		}
		
		return $instance;
	}
	
	static private function &_createDatabase() {
		Core::import("includes.database.database");
		
		$settings =& Core::getSettings();
		
		$db =& Database::getInstance(Array(
			"driver"   => $settings->get("db_type"),
			"host" 	   => $settings->get("db_host"),
			"user" 	   => $settings->get("db_user"),
			"password" => $settings->get("db_password"),
			"database" => $settings->get("db_name"),
			"prefix"   => $settings->get("db_tblprefix")
		));
		
		$db->debug($settings->get("debug"));
		
		return $db;
	}
	
	static public function import($filePath) {
		static $paths;
		
		if (!isset($paths)) {
			$paths = Array();
		}
		
		$trs = 1;
		
		if (!isset($paths[$filePath])) {
			$parts = explode(".", $filePath);
			$base = dirname(__FILE__);
			
			if (array_pop($parts) == "*") {
				$path = $base . DS . implode(DS, $parts);
				
				if (!is_dir($path)) {
					return false;
				}

				$dir = dir($path);
				
				while ($file = $dir->read()) {
					if (preg_match("#(.*?)\.php$#", $file, $m)) {
						$nPath = str_replace("*", $m[1], $filePath);
						
						$keyPath = $nPath;
						
						if (!isset($paths[$keyPath])) {
							$rs	= require_once($path . DS . $file);
							$trs =& $rs;
						}
					}
				}
				
				$dir->close();
			} else {
				$path = str_replace(".", DS, $filePath);
				$trs = require_once($base . DS . $path . ".php");
			}
			
			$paths[$keyPath] = $trs;
		}
		
		return $trs;
	}
}

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

function localizedDate($format, $timestamp) {
	$result = date($format, $timestamp);
	
	$weekdaysEN = Array("/Monday/", "/Tuesday/", "/Wednesday/", "/Thursday/", "/Fr iday/", "/Saturday/", "/Sunday/");
	$weekdaysDE = Array("Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag",  "Samstag", "Sonntag");
	
	$monthsEN = Array("/January/", "/February/", "/March/", "/April/", "/May/", "/June/", "/July/", "/August/", "/September/", "/October/", "/November/", "/December/");
	$monthsDE = Array("Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember");
	
	$result = preg_replace($weekdaysEN, $weekdaysDE, $result);
	$result = preg_replace($monthsEN, $monthsDE, $result);
	
	return $result;
}

function sanitizeFileName($str) {
	return preg_replace("/[^A-Z0-9|\.|'|\-|\[|\]]/i", "_", $str);
}

function parseFileName($fileName) {
	$fileNameParts = explode(".", strrev($fileName), 2);
	
	return Array(
		"base" => strrev($fileNameParts[1]),
		"ext"  => strtolower(strrev($fileNameParts[0]))
	);
}

?>