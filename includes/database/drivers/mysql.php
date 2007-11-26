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
*/
class DatabaseMysql extends Database {
	/** @var string The database driver name */
	public $name = "mysql";
	
	/** @var string The null/zero date string */
	protected $_nullDate = "0000-00-00 00:00:00";
	
	/** @var string Quote for named objects */
	protected $_nameQuote	= "`";
	
	/**
	 * Database object constructor
	 *
	 * @access	public
	 * @param	array	List of options used to configure the connection
	 * @see		JDatabase
	*/
	public function __construct($options) {
		$host		= array_key_exists("host", 	   $options) ? $options["host"]		: "localhost";
		$user		= array_key_exists("user", 	   $options) ? $options["user"]		: "";
		$password	= array_key_exists("password", $options) ? $options["password"]	: "";
		$database	= array_key_exists("database", $options) ? $options["database"]	: "";
		$prefix		= array_key_exists("prefix",   $options) ? $options["prefix"]	: "kb_";
		
		// Perform a number of fatality checks, then return gracefully
		if (!$this->test()) {
			$this->_errorNum = 1;
			$this->_errorMsg = "The MySQL adapter '" . $this->name . "' is not available.";
			return;
		}
		
		// Connect to the server
		if (!($this->_resource = @mysql_connect($host, $user, $password, true))) {
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
	*/
	function __destruct() {
		$return = false;
		
		if (is_resource($this->_resource)) {
			$return = mysql_close($this->_resource);
		}
		
		return $return;
	}

	/**
	 * Test to see if the MySQL connector is available
	 *
	 * @static
	 * @access public
	 * @return boolean  True on success, false otherwise.
	*/
	public function test() {
		return function_exists($this->name . "_connect");
	}

	/**
	 * Determines if the connection to the server is active.
	 *
	 * @access	public
	 * @return	boolean
	*/
	public function connected() {
		if (is_resource($this->_resource)) {
			return mysql_ping($this->_resource);
		}
		
		return false;
	}

	/**
	 * Select a database for use
	 *
	 * @access	public
	 * @param	string $database
	 * @return	boolean True if the database has been successfully selected
	*/
	public function select($database) {
		if (!$database) {
			return false;
		}
		
		if (!mysql_select_db($database, $this->_resource)) {
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
	 * Determines UTF support
	 * @return boolean True - UTF is supported
	*/
	public function hasUTF() {
		$verParts = explode(".", $this->getVersion());
		return ($verParts[0] == 5 || ($verParts[0] == 4 && $verParts[1] == 1 && (int)$verParts[2] >= 2));
	}

	/**
	 * Custom settings for UTF support
	*/
	public function setUTF() {
		$this->_query("SET NAMES 'utf8'");
	}

	/**
	 * Get a database escaped string
	 * @return string
	*/
	public function getEscaped($value) {
		if (get_magic_quotes_gpc()) {
			$value = stripslashes($value);
		}
		
		return $value;
	}

	/**
	* Execute the query
	* @return mixed A database resource if successful, FALSE if not.
	*/
	public function query() {
		if (!$this->_resource) {
			return false;
		}
		
		if ($this->_limit > 0 || $this->_offset > 0) {
			$this->_sql .= " LIMIT " . $this->_offset . ", " . $this->_limit;
		}
		
		if ($this->_debug) {
			$this->_ticker++;
			$this->_log[] = $this->_sql;
		}
		
		$this->_errorNum = 0;
		$this->_errorMsg = "";
		
		$this->_cursor = $this->_query($this->_sql);
		
		if (!$this->_cursor) {
			$this->_errorNum = $this->_errno();
			$this->_errorMsg = $this->_error() . " SQL=" . $this->_sql;
			
			if ($this->_debug) {
				// Hay!
				// JError::raiseError('joomla.database:'.$this->_errorNum, 'JDatabaseMySQL::query: '.$this->_errorMsg );
			}
			
			return false;
		}
		
		return $this->_cursor;
	}

	/**
	 * @return int The number of affected rows in the previous operation
	*/
	public function getAffectedRows() {
		return mysql_affected_rows($this->_resource);
	}

	/**
	 * Execute a batch query
	 * 
	 * @return mixed A database resource if successful, FALSE if not.
	*/
	public function queryBatch($abort_on_error = true, $p_transaction_safe = false) {
		$this->_errorNum = 0;
		$this->_errorMsg = "";
		
		if ($p_transaction_safe) {
			$si = $this->getVersion();
			preg_match_all("/(\d+)\.(\d+)\.(\d+)/i", $si, $m);
			
			if ($m[1] >= 4) {
				$this->_sql = "START TRANSACTION;" . $this->_sql . "; COMMIT;";
			} else if ($m[2] >= 23 && $m[3] >= 19) {
				$this->_sql = "BEGIN WORK;" . $this->_sql . "; COMMIT;";
			} else if ($m[2] >= 23 && $m[3] >= 17) {
				$this->_sql = "BEGIN;" . $this->_sql . "; COMMIT;";
			}
		}
		
		$query_split = preg_split ("/[;]+/", $this->_sql);
		$error = 0;
		
		foreach ($query_split as $command_line) {
			$command_line = trim($command_line);
			
			if ($command_line != "") {
				$this->_cursor = $this->_query($command_line);
				
				if (!$this->_cursor) {
					$error = 1;
					$this->_errorNum .= $this->_errno() . " ";
					$this->_errorMsg .= $this->_error() . " SQL=$command_line <br />";
					
					if ($abort_on_error) {
						return $this->_cursor;
					}
				}
			}
		}
		
		return $error ? false : true;
	}
	
	/**
	 * Diagnostic function
	*/
	public function explain() {
		$temp = $this->_sql;
		$this->_sql = "EXPLAIN " . $this->_sql;
		$this->query();

		if (!($cur = $this->query())) {
			return null;
		}
		
		$first = true;

		$buffer = "<table id=\"explain-sql\">";
		$buffer .= "<thead><tr><td colspan=\"99\">" . $this->getQuery() . "</td></tr>";
		
		while ($row = $this->fetchAssoc($cur)) {
			if ($first) {
				$buffer .= "<tr>";
				
				foreach ($row as $k => $v) {
					$buffer .= "<th>" . $k . "</th>";
				}
				
				$buffer .= "</tr>";
				$first = false;
			}
			
			$buffer .= "</thead><tbody><tr>";
			
			foreach ($row as $k => $v) {
				$buffer .= "<td>" . $v . "</td>";
			}
			
			$buffer .= "</tr>";
		}
		
		$buffer .= "</tbody></table>";
		
		$this->freeResult($cur);
		
		$this->_sql = $temp;
		
		return $buffer;
	}

	/**
	 * @return int The number of rows returned from the most recent query.
	*/
	public function getNumRows($cur = null) {
		return mysql_num_rows($cur ? $cur : $this->_cursor);
	}

	/**
	 * This method loads the first field of the first row returned by the query.
	 *
	 * @return The value returned in the query or null if the query failed.
	*/
	public function loadResult() {
		if (!($cur = $this->query())) {
			return null;
		}
		
		$ret = null;
		
		if ($row = $this->fetchRow($cur)) {
			$ret = $row[0];
		}
		
		$this->freeResult($cur);
		
		return $ret;
	}
	
	/**
	 * Load an array of single field results into an array
	*/
	public function loadResultArray($numinarray = 0) {
		if (!($cur = $this->query())) {
			return null;
		}
		
		$array = Array();
		
		while ($row = $this->fetchRow($cur)) {
			$array[] = $row[$numinarray];
		}
		
		$this->freeResult($cur);
		
		return $array;
	}

	/**
	 * Fetch a result row as an associative array
	 *
	 * return array
	*/
	public function loadAssoc() {
		if (!($cur = $this->query())) {
			return null;
		}
		
		$ret = null;
		
		if ($array = $this->fetchAssoc($cur)) {
			$ret = $array;
		}
		
		$this->freeResult($cur);
		
		return $ret;
	}

	/**
	 * Load a assoc list of database rows
	 *
	 * @param string The field name of a primary key
	 * @return array If <var>key</var> is empty as sequential list of returned records.
	*/
	public function loadAssocList($key = "") {
		if (!($cur = $this->query())) {
			return null;
		}
		
		$array = Array();
		
		while ($row = $this->fetchAssoc($cur)) {
			if ($key) {
				$array[$row[$key]] = $row;
			} else {
				$array[] = $row;
			}
		}
		
		$this->freeResult($cur);
		
		return $array;
	}
	
	/**
	 * This global function loads the first row of a query into an object
	 *
	 * return object
	*/
	public function loadObject() {
		if (!($cur = $this->query())) {
			return null;
		}
		
		$ret = null;
		
		if ($object = $this->fetchObject($cur)) {
			$ret = $object;
		}
		
		$this->freeResult($cur);
		
		return $ret;
	}
	
	/**
	 * Load a list of database objects
	 * @param string The field name of a primary key
	 * @return array If <var>key</var> is empty as sequential list of returned records.
	 * If <var>key</var> is not empty then the returned array is indexed by the value
	 * the database key.  Returns <var>null</var> if the query fails.
	*/
	public function loadObjectList($key = "") {
		if (!($cur = $this->query())) {
			return null;
		}
		
		$array = Array();
		
		while ($row = $this->fetchObject($cur)) {
			if ($key) {
				$array[$row->$key] = $row;
			} else {
				$array[] = $row;
			}
		}
		
		$this->freeResult($cur);
		
		return $array;
	}
	
	/**
	 * @return The first row of the query.
	*/
	public function loadRow() {
		if (!($cur = $this->query())) {
			return null;
		}
		
		$ret = null;
		
		if ($row = $this->fetchRow($cur)) {
			$ret = $row;
		}
		
		$this->freeResult($cur);
		
		return $ret;
	}
	
	/**
	 * Load a list of database rows (numeric column indexing)
	 * @param string The field name of a primary key
	 * @return array If <var>key</var> is empty as sequential list of returned records.
	 * If <var>key</var> is not empty then the returned array is indexed by the value
	 * the database key.  Returns <var>null</var> if the query fails.
	*/
	public function loadRowList($key = null) {
		if (!($cur = $this->query())) {
			return null;
		}
		
		$array = Array();
		
		while ($row = $this->fetchRow($cur)) {
			if ($key !== null) {
				$array[$row[$key]] = $row;
			} else {
				$array[] = $row;
			}
		}
		
		$this->freeResult($cur);
		
		return $array;
	}
	
	/**
	 * Inserts a row into a table based on an objects properties
	 * @param	string	The name of the table
	 * @param	object	An object whose properties match table fields
	 * @param	string	The name of the primary key. If provided the object property is updated.
	 */
	public function insertObject($table, &$object, $keyName = null) {
		$fmtsql = "INSERT INTO $table ( %s ) VALUES ( %s ) ";
		$fields = Array();
		
		foreach (get_object_vars($object) as $k => $v) {
			if (is_array($v) or is_object($v) or $v === NULL) {
				continue;
			}
			
			if ($k[0] == "_") { // Internal field
				continue;
			}
			
			$fields[] = $this->nameQuote($k);
			$values[] = $this->isQuoted($k) ? $this->quote($v) : (int)$v;
		}
		
		$this->setQuery(sprintf($fmtsql, implode(",", $fields), implode(",", $values)));
		
		if (!$this->query()) {
			return false;
		}
		
		$id = $this->insertId();
		
		if ($keyName && $id) {
			$object->$keyName = $id;
		}
		
		return true;
	}

	/**
	 * Document::db_updateObject()
	 * @param [type] $updateNulls
	 */
	public function updateObject($table, &$object, $keyName, $updateNulls = true) {
		$fmtsql = "UPDATE $table SET %s WHERE %s";
		$tmp = Array();
		
		foreach (get_object_vars($object) as $k => $v) {
			if(is_array($v) or is_object($v) or $k[0] == "_") { // Internal or NA field
				continue;
			}
			
			if ($k == $keyName) { // PK not to be updated
				$where = $keyName . "=" . $this->quote($v);
				continue;
			}
			
			if ($v === null) {
				if ($updateNulls) {
					$val = "NULL";
				} else {
					continue;
				}
			} else {
				$val = $this->isQuoted($k) ? $this->quote($v) : (int) $v;
			}
			
			$tmp[] = $this->nameQuote($k) . "=" . $val;
		}
		
		$this->setQuery(sprintf($fmtsql, implode(",", $tmp), $where));
		return $this->query();
	}
	
	public function freeResult($cur = null) {
		return mysql_free_result($cur ? $cur : $this->_cursor);
	}
	
	public function fetchObject($cur = null) {
		return mysql_fetch_object($cur ? $cur : $this->_cursor);
	}
	
	public function fetchRow($cur = null) {
		return mysql_fetch_row($cur ? $cur : $this->_cursor);
	}
	
	public function fetchAssoc($cur = null) {
		return mysql_fetch_assoc($cur ? $cur : $this->_cursor);
	}
	
	protected function _errno() {
		return mysql_errno($this->_resource);
	}
	
	protected function _error() {
		return mysql_error($this->_resource);
	}
	
	protected function _query($query) {
		return mysql_query($query, $this->_resource);
	}
	
	public function insertId() {
		return mysql_insert_id($this->_resource);
	}

	public function getVersion() {
		return mysql_get_server_info($this->_resource);
	}

	/**
	 * Assumes database collation in use by sampling one text field in one table
	 * @return string Collation in use
	*/
	public function getCollation() {
		if ($this->hasUTF()) {
			$this->setQuery("SHOW FULL COLUMNS FROM #__content");
			$array = $this->loadAssocList();
			return $array["4"]["Collation"];
		} else {
			return "N/A (mySQL < 4.1.2)";
		}
	}

	/**
	 * @return array A list of all the tables in the database
	*/
	public function getTableList() {
		$this->setQuery("SHOW TABLES");
		return $this->loadResultArray();
	}
	
	/**
	 * @param array A list of table names
	 * @return array A list the create SQL for the tables
	 */
	public function getTableCreate($tables) {
		$result = Array();
		
		foreach ($tables as $tblval) {
			$this->setQuery("SHOW CREATE table " . $this->getEscaped($tblval));
			$rows = $this->loadRowList();
			
			foreach ($rows as $row) {
				$result[$tblval] = $row[1];
			}
		}
		
		return $result;
	}
	
	/**
	 * @param array A list of table names
	 * @return array An array of fields by table
	*/
	public function getTableFields($tables) {
		$result = Array();
		
		foreach ($tables as $tblval) {
			$this->setQuery("SHOW FIELDS FROM " . $tblval);
			$fields = $this->loadObjectList();
			
			foreach ($fields as $field) {
				$result[$tblval][$field->Field] = preg_replace("/[(0-9)]/",'', $field->Type);
			}
		}

		return $result;
	}
}

?>