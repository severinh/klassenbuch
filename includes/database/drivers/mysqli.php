<?php
/*
 * Klassenbuch
 * Database Abstraction Layer: Based on Joomla.Framework subpackage Database.
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

// Auf diese Datei ist kein direkter Zugriff erlaubt.
defined("_KBSECURE") or die("Zugriff verweigert.");

Core::import("includes.database.drivers.mysql");

/**
 * @version		$Id: database.php 8575 2007-08-26 20:02:09Z jinx $
 * @package		Joomla.Framework
 * @subpackage	Database
 * @copyright	Copyright (C) 2005 - 2007 Open Source Matters. All rights reserved.
 * @license		GNU/GPL, see LICENSE.php
 * Joomla! is free software. This version may have been modified pursuant
 * to the GNU General Public License, and as distributed it includes or
 * is derivative of works licensed under the GNU General Public License or
 * other free or open source software licenses.
 * See COPYRIGHT.php for copyright notices and details.
*/

/**
 * MySQL database driver
 *
 * @package		Joomla.Framework
 * @subpackage	Database
 * @since		1.0
*/
class DatabaseMysqli extends DatabaseMysql {
	/** @var string The database driver name */
	public $name = "mysqli";
	
	/**
	 * Database object constructor
	 *
	 * @access	public
	 * @param	array	List of options used to configure the connection
	 * @since	1.5
	 * @see		JDatabase
	*/
	public function __construct($options) {
		$host		= array_key_exists("host", 	   $options) ? $options["host"]		: "localhost";
		$user		= array_key_exists("user", 	   $options) ? $options["user"]		: "";
		$password	= array_key_exists("password", $options) ? $options["password"]	: "";
		$database	= array_key_exists("database", $options) ? $options["database"]	: "";
		$prefix		= array_key_exists("prefix",   $options) ? $options["prefix"]	: "kb_";
		
		// Unlike mysql_connect(), mysqli_connect() takes the port and socket as separate arguments. Therefore, we have
		// to extract them from the host string.
		$port = NULL;
		$socket	= NULL;
		$targetSlot = substr(strstr($host, ":"), 1);
		
		if (!empty($targetSlot)) {
			// Get the port number or socket name
			if (is_numeric($targetSlot)) {
				$port = $targetSlot;
			} else {
				$socket	= $targetSlot;
			}
			
			// Extract the host name only
			$host = substr($host, 0, strlen($host) - (strlen($targetSlot) + 1));
			
			// This will take care of the following notation: ":3306"
			if ($host == "") {
				$host = "localhost";
			}
		}
		
		// Perform a number of fatality checks, then return gracefully
		if (!$this->test()) {
			$this->_errorNum = 1;
			$this->_errorMsg = "The MySQL adapter '" . $this->name . "' is not available.";
			return;
		}
		
		// Connect to the server
		if (!($this->_resource = @mysqli_connect($host, $user, $password, NULL, $port, $socket))) {
			$this->_errorNum = 2;
			$this->_errorMsg = "Could not connect to MySQL";
			return;
		}
		
		// Finalize initialization
		parent::__construct($options);
		
		// Select the database
		$this->select($database);
	}

	/**
	 * Database object destructor
	 *
	 * @return boolean
	 * @since 1.5
	*/
	function __destruct() {
		$return = false;
		
		if (is_resource($this->_resource)) {
			$return = mysqli_close($this->_resource);
		}
		
		return $return;
	}

	/**
	 * Determines if the connection to the server is active.
	 *
	 * @access	public
	 * @return	boolean
	 * @since	1.5
	*/
	public function connected() {
		return $this->_resource->ping();
	}

	/**
	 * Select a database for use
	 *
	 * @access	public
	 * @param	string $database
	 * @return	boolean True if the database has been successfully selected
	 * @since	1.5
	*/
	public function select($database) {
		if (!$database) {
			return false;
		}
		
		if (!mysqli_select_db($this->_resource, $database)) {
			$this->_errorNum = 3;
			$this->_errorMsg = "Could not connect to database";
			return false;
		}

		// If running mysql 5, set sql-mode to mysql40 - thereby circumventing strict mode problems
		if (strpos($this->getVersion(), "5") === 0) {
			$this->setQuery("SET sql_mode = 'MYSQL40'");
			$this->query();
		}

		return true;
	}

	/**
	 * Get a database escaped string
	 * @return string
	*/
	public function getEscaped($text) {
		return mysqli_real_escape_string($this->_resource, $text);
	}
	
	/**
	 * @return int The number of rows returned from the most recent query.
	*/
	public function getNumRows($cur = null) {
		return mysqli_num_rows($cur ? $cur : $this->_cursor);
	}
	
	public function freeResult($cur = null) {
		return mysqli_free_result($cur ? $cur : $this->_cursor);
	}
	
	public function fetchObject($cur = null) {
		return mysqli_fetch_object($cur ? $cur : $this->_cursor);
	}
	
	public function fetchRow($cur = null) {
		return mysqli_fetch_row($cur ? $cur : $this->_cursor);
	}
	
	public function fetchAssoc($cur = null) {
		return mysqli_fetch_assoc($cur ? $cur : $this->_cursor);
	}
	
	protected function _errno() {
		return mysqli_errno($this->_resource);
	}
	
	protected function _error() {
		return mysqli_error($this->_resource);
	}
	
	protected function _query($query) {
		return mysqli_query($query, $this->_resource);
	}
	
	public function insertId() {
		return mysqli_insert_id($this->_resource);
	}
	
	public function getVersion() {
		return mysqli_get_server_info($this->_resource);
	}
	
	/**
	 * @return int The number of affected rows in the previous operation
	 * @since 1.0.5
	*/
	public function getAffectedRows() {
		return mysqli_affected_rows($this->_resource);
	}
}

?>