<?php
/**
 * Klassenbuch
 * Database Abstraction Layer
 * Copyright (C) 2006 - 2007 Severin Heiniger
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

class TableComments extends Table {
	/** @public int id Primary key */
	public $id = null;
	
	/** @public int taskid */
	public $taskid = null;
	
	/** @public int userid */
	public $userid = null;
	
	/** @public int date */
	public $date = null;
	
	/** @public string text */
	public $comment = null;
	
	protected $_type_map = Array(
		"id" 		=> "int",
		"taskid" 	=> "int",
		"userid" 	=> "userid",
		"date" 		=> "double",
		"comment"	=> "string"
	);
	
	/**
	 * @param database A database connector object
	*/
	public function __construct(&$db) {
		parent::__construct("#__comments", "id", $db);
	}

	/**
	 * Overloaded check function
	 *
	 * @access public
	 * @return boolean
	*/
	public function check() {
		$this->enforceTypes();
		$this->comment = trim(strip_tags($this->comment));
		
		if (!$this->date) {
			$this->setError("The comment must have a date.");
		} else if (empty($this->comment)) {
			$this->setError("The comment must have some text.");
		} else if (!$this->userid) {
			$this->setError("The comment must have a writer.");
		} else if (!$this->taskid) {
			$this->setError("The comment must belong to a task.");
		} else {
			return true;
		}
		
		return false;
	}
}

?>