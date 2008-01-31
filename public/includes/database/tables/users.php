<?php
/**
 * Klassenbuch
 * Database Abstraction Layer
 * Copyright (C) 2006 - 2008 Severin Heiniger
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * 
 * To view the GNU General Public License visit
 * http://www.gnu.org/copyleft/gpl.html
 * or write to the Free Software Foundation, Inc.,
 * 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
*/

// Ensures this file was included from within the application.
defined("_KBSECURE") or die("Access denied.");

Core::import("includes.json");

class TableUsers extends Table {
	/** @public int id Primary key */
	public $id = null;
	
	public $firstname = null;
	
	public $surname = null;
	
	public $nickname = null;
	
	public $mail = null;
	
	public $password = null;
	
	public $address = null;
	
	public $plz = null;
	
	public $location = null;
	
	public $phone = null;
	
	public $mobile = null;
	
	public $classmember = null;
	
	public $mainsubject = null;
	
	public $posts = null;
	
	public $newpassword = null;
	
	public $newpasswordkey = null;
	
	public $token = null;
	
	public $settings = null;
	
	public $isadmin = null;
	
	public $lastcontact = null;
	
	public $state = null;
	
	protected $_type_map = Array(
		"id" 			 => "int",
		"firstname"		 => "string",
		"surname"		 => "string",
		"nickname"		 => "string",
		"mail"			 => "string",
		"password"		 => "string",
		"address"		 => "string",
		"plz"			 => "int",
		"location"		 => "string",
		"phone"			 => "string",
		"mobile"		 => "string",
		"classmember"	 => "bool",
		"mainsubject"	 => "string",
		"posts"			 => "int",
		"newpassword"	 => "string",
		"newpasswordkey" => "string",
		"token"			 => "string",
		"settings"		 => "string",
		"isadmin"		 => "bool",
		"lastcontact"	 => "double",
		"state"			 => "int"
	);
	
	/**
	 * @param database A database connector object
	*/
	public function __construct(&$db) {
		parent::__construct("#__users", "id", $db);
	}

	/**
	 * Overloaded check function
	 *
	 * @access public
	 * @return boolean
	*/
	public function check() {
		$this->enforceTypes();
		
		$this->firstname 	= trim(strip_tags($this->firstname));
		$this->surname 	= trim(strip_tags($this->surname));
		$this->nickname 	= trim(strip_tags($this->nickname));
		$this->mail 		= trim(strip_tags($this->mail));
		$this->address 		= trim(strip_tags($this->address));
		$this->location 	= trim(strip_tags($this->location));
		$this->phone 		= trim(strip_tags($this->phone));
		$this->mobile 		= trim(strip_tags($this->mobile));
		$this->mainsubject 	= trim(strip_tags($this->mainsubject));
		
		$regExpPLZ = "/^[1-9]\d{3}$/";
		$regExpPhone = "/^(0\d{2} \d{3}( \d\d){2})|(0\d{9})|(\+[1-9]\d{10})$/";
		$regExpMail = "/^[a-zA-Z0-9]+[_a-zA-Z0-9-]*(\.[_a-z0-9-]+)*@[a-z??????0-9]+(-[a-z??????0-9]+)*(\.[a-z??????0-9-]+)*(\.[a-z]{2,4})$/";
		
		if (empty($this->firstname)) {
			$this->setError("The user must have a firstname.");
		} else if (empty($this->surname)) {
			$this->setError("The user must have a surname.");
		} else if (empty($this->nickname)) {
			$this->setError("The user must have a nickname.");
		} else if (!empty($this->mail) && !preg_match($regExpMail, $this->mail)) {
			$this->setError("This is an invalid phone number.");
		} else if (!empty($this->plz) && !preg_match($regExpPLZ, $this->plz)) {
			$this->setError("This is not a valid PLZ number.");
		} else if (!empty($this->phone) && !preg_match($regExpPhone, $this->phone)) {
			$this->setError("This is an invalid phone number.");
		} else if (!empty($this->mobile) && !preg_match($regExpPhone, $this->mobile)) {
			$this->setError("This is an invalid mobile phone number.");
		} else {
			return true;
		}
		
		return false;
	}
	
	public function bind($array, $ignore = "") {
		if (key_exists("settings", $array) && is_array($array["settings"])) {
			$json = new Services_JSON(SERVICES_JSON_LOOSE_TYPE);
			$array["settings"] = $json->encode($array["settings"]);
		}
		
		return parent::bind($array, $ignore);
	}
}

?>