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

class TableTasks extends Table {
	/** @public int id Primary key */
	public $id = null;
	
	/** @public int date */
	public $date = null;
	
	/** @public int subject */
	public $subject = null;
	
	/** @public string text */
	public $text = null;
	
	/** @public bool important */
	public $important = null;
	
	/** @public int userid */
	public $userid = null;
	
	/** @public int added */
	public $added = null;
	
	/** @public string commentsreadby */
	public $commentsreadby = null;
	
	/** @public string doneby */
	public $doneby = null;
	
	/** @public bool removed */
	public $removed = null;
	
	protected $_type_map = Array(
		"id" 			 => "int",
		"date" 			 => "double",
		"subject"		 => "int",
		"text"			 => "string",
		"userid" 		 => "int",
		"added"			 => "double",
		"commentsreadby" => "string",
		"doneby"         => "string",
		"removed"		 => "bool"
	);
	
	/**
	 * @param database A database connector object
	*/
	public function __construct(&$db) {
		parent::__construct("#__tasks", "id", $db);
	}

	/**
	 * Overloaded check function
	 *
	 * @access public
	 * @return boolean
	*/
	public function check() {
		$this->enforceTypes();
		$this->text = trim(strip_tags($this->text));
		
		if (!$this->date) {
			$this->setError("The task must have a date.");
		} else if  ($this->date < mktime(0, 0, 0)) {
			$this->setError("The task's date musn't be in the past.");
		} else if (!$this->subject) {
			$this->setError("The task must belong to a subject.");
		} else if (empty($this->text)) {
			$this->setError("The task must have some text.");
		} else if (!$this->userid) {
			$this->setError("The task must have a creator.");
		} else {
			return true;
		}
		
		return false;
	}
}

?>