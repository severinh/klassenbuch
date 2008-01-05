<?php
/**
 * Klassenbuch
 * Database Abstraction Layer
 * Based on Joomla.Framework subpackage Database.
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

/**
 * Abstract Table class
 *
 * @abstract
*/
class Table {
	/** @public string Name of the table in the database schema relating to child class. */
	protected $_tbl = "";

	/** @public string Name of the primary key field in the table. */
	protected $_tbl_key	= "";

	/** @public string Error Message. */
	protected $_error = null;
	
	/** @public string Error number. */
	protected $_errorNum = 0;

	/** @public string Database connector. */
	protected $_db = null;
	
	/** @public array Field types map. */
	protected $_type_map = Array();

	/**
	 * Object constructor to set table and key field
	 *
	 * Can be overloaded/supplemented by the child class
	 *
	 * @access protected
	 * @param string table Name of the table in the db schema relating to child class
	 * @param string key Name of the primary key field in the table
	 * @param object db Database object
	*/
	public function __construct($table, $key, &$db) {
		$this->_tbl	= $table;
		$this->_tbl_key	= $key;
		$this->_db =& $db;
	}

	/**
	 * Returns a reference to the a Table object, always creating it
	 *
	 * @param string table The table type to instantiate
	 * @return Table The specific Table instance
	*/
	static public function &getInstance($table) {
		$className = "Table" . ucfirst($table);
		
		if (!class_exists($className)) {
			Core::import("includes.database.tables." . $table);
		}
		
		$database =& Core::getDatabase();
		
		return new $className($database);
	}
	
	/**
	 * Gets the internal table name for the object
	 *
	 * @return string
	*/
	public function getTableName() {
		return $this->_tbl;
	}

	/**
	 * Gets the internal primary key name
	 *
	 * @return string
	*/
	public function getKeyName() {
		return $this->_tbl_key;
	}
	
	/**
	 * Get the most recent error message
	 *
	 * @return string Error message
	*/
	public function getError() {
		return $this->_error;
	}
	
	/**
	 * Returns the error number
	 *
	 * @return int Error number
	*/
	public function getErrorNum() {
		return $this->_errorNum;
	}

	/**
	 * Resets the default properties
	*/
	public function reset() {
		$ignore = Array($this->_tbl_key, "_db", "_tbl", "_tbl_key");
		
		foreach (get_class_vars(get_class($this)) as $name => $value) {
			if (!in_array($name, $ignore)) {
				$this->$name = $value;
			}
		}
	}
	
	public function enforceTypes() {
		foreach ($this->_type_map as $field => $type) {
			switch ($type) {
				case "integer":
				case "int": 	$this->$field = (int) 	 $this->$field; break;
				case "bool":
				case "boolean": $this->$field = (bool) 	 $this->$field; break;
				case "float":
				case "double":
				case "real": 	$this->$field = (real) 	 $this->$field; break;
				case "string": 	$this->$field = (string) $this->$field; break;
			}
		}
	}

	/**
	 * Binds a named array/hash to this object
	 *
	 * Can be overloaded/supplemented by the child class
	 *
	 * @param from mixed An associative array or object
	 * @param [ignore] mixed An array or space separated list of fields not to bind
	 * @return boolean
	*/
	public function bind($from, $ignore = Array()) {
		$fromArray = is_array($from);
		$fromObject	= is_object($from);
		
		if (!$fromArray && !$fromObject) {
			$this->setError(get_class($this) . "::bind failed: Invalid from argument");
			$this->setErrorNum(20);
			return false;
		}
		
		if (!is_array($ignore)) {
			$ignore = explode(" ", $ignore);
		}
		
		foreach (get_object_vars($this) as $key => $value) {
			// Internal attributes of an object are ignored
			if (substr($key, 0, 1) != "_" && !in_array($key, $ignore)) {
				if ($fromArray && isset($from[$key])) {
					$this->$key = $from[$key];
				} else if ($fromObject && isset($from->$key)) {
					$this->$key = $from->$key;
				}
			}
		}
		
		$this->enforceTypes();
		
		return true;
	}

	/**
	 * Loads a row from the database and binds the fields to the object properties
	 *
	 * @param mixed Optional primary key. If not specifed, the value of current key is used
	 * @return boolean True if successful
	*/
	public function load($oid = null) {
		$key = $this->_tbl_key;
		
		if ($oid !== null) {
			$this->$key = (int) $oid;
		}
		
		$oid = $this->$key;
		
		if ($oid === null) {
			return false;
		}
		
		$this->reset();
		
		$this->_db->setQuery("SELECT * FROM " . $this->_tbl . " WHERE " . $key . " = " . $this->_db->quote($oid));
		
		if ($result = $this->_db->loadAssoc()) {
			return $this->bind($result);
		}
		
		$this->setError($this->_db->getErrorMsg());
		$this->setErrorNum($this->_db->getErrorNum());
		return false;
	}

	/**
	 * Generic check method
	 *
	 * Can be overloaded/supplemented by the child class
	 *
	 * @return boolean True if the object is ok
	*/
	public function check() {
		return true;
	}

	/**
	 * Inserts a new row if id is zero or updates an existing row in the database table
	 *
	 * Can be overloaded/supplemented by the child class
	 *
	 * @access public
	 * @param boolean If false, null object variables are not updated
	 * @return null|string null if successful otherwise returns and error message
	*/
	public function store($updateNulls = false) {
		$k = $this->_tbl_key;
		
		if ($this->$k) {
			$ret = $this->_db->updateObject($this->_tbl, $this, $this->_tbl_key, $updateNulls);
		} else {
			$ret = $this->_db->insertObject($this->_tbl, $this, $this->_tbl_key);
		}
		
		if ($ret) {
			return true;
		}
		
		$this->setError(get_class($this) . "::store failed: " . $this->_db->getErrorMsg());
		$this->setErrorNum($this->_db->getErrorNum());
		
		return false;
	}
	
	/**
	 * Default delete method
	 *
	 * Can be overloaded/supplemented by the child class
	 *
	 * @access public
	 * @return true if successful otherwise returns and error message
	*/
	public function delete($oid = null) {
		$k = $this->_tbl_key;
		
		if ($oid) {
			$this->$k = (int) $oid;
		}
		
		$this->_db->setQuery("DELETE FROM " . $this->_db->nameQuote($this->_tbl) . " WHERE " .
			$this->_tbl_key . " = ". $this->_db->quote($this->$k));
		
		if ($this->_db->query()) {
			return true;
		}
		
		$this->setError($this->_db->getErrorMsg());
		$this->setErrorNum($this->_db->getErrorNum());
		return false;
	}

	/**
	 * Generic save function
	 *
	 * @access public
	 * @param array Source array for binding to class vars
	 * @param mixed An array or space separated list of fields not to bind
	 * @returns True if completely successful, false if partially or not succesful.
	*/
	public function save($source, $ignore = Array()) {
		if (!$this->bind($source, $ignore)) {
			return false;
		}
		
		if (!$this->check()) {
			return false;
		}
		
		if (!$this->store()) {
			return false;
		}
		
		$this->setError("");
		$this->setErrorNum(0);
		return true;
	}
	
	/**
	 * Set an error message
	 * 
	 * @param string $error Error message
	 * @access public
	*/
	public function setError($error) {
		$this->_error = $error;
	}

	/**
	 * Sets the internal error number
	 *
	 * @param int Set the error number with this value
	*/
	public function setErrorNum($value) {
		$this->_errorNum = $value;
	}
}

?>