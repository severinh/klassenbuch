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

class TableSubjects extends Table {
	/** @public int id Primary key */
	public $id = null;
	
	/** @public int long */
	public $long = null;
	
	/** @public int short */
	public $short = null;
	
	protected $_type_map = Array(
		"id" 	=> "int",
		"long"	=> "string",
		"short"	=> "string"
	);
	
	/**
	 * @param database A database connector object
	*/
	public function __construct(&$db) {
		parent::__construct("#__subjects", "id", $db);
	}

	/**
	 * Overloaded check function
	 *
	 * @access public
	 * @return boolean
	*/
	public function check() {
		$this->enforceTypes();
		
		$this->long = trim(strip_tags($this->long));
		$this->short = trim(strip_tags($this->short));
		
		if (empty($this->long)) {
			$this->setError("The subject must have a title.");
		} else if (empty($this->short)) {
			$this->setError("The subject must have an abbrevation.");
		} else {
			return true;
		}
		
		return false;
	}
}

?>