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
defined("_KBSECURE") or die("Access denied.");

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
 * Database connector class
 *
 * @abstract
 * @package		Joomla.Framework
 * @subpackage	Database
*/
class Database {
	/** @public string The database driver name */
	public $name = "";
	
	/** @private string Internal private variable to hold the query sql */
	protected $_sql = "";
	
	/** @private int Internal private variable to hold the database error number */
	protected $_errorNum = 0;
	
	/** @private string Internal private variable to hold the database error message */
	protected $_errorMsg = "";
	
	/** @private string Internal private variable to hold the prefix used on all database tables */
	protected $_table_prefix = "";
	
	/** @private Internal private variable to hold the connector resource */
	protected $_resource = null;
	
	/** @private Internal private variable to hold the last query cursor */
	protected $_cursor = null;
	
	/** @private boolean Debug option */
	protected $_debug = 0;
	
	/** @private int The limit for the query */
	protected $_limit = 0;
	
	/** @private int The for offset for the limit */
	protected $_offset = 0;
	
	/** @private int A counter for the number of queries performed by the object instance */
	protected $_ticker = 0;
	
	/** @private array A log of queries */
	protected $_log = null;
	
	/** @private string The null/zero date string */
	protected $_nullDate = null;
	
	/** @private string Quote for named objects */
	protected $_nameQuote = null;
	
	/** @public boolean UTF-8 support */
	protected $_utf = 0;
	
	/** @public array The fields that are to be quote */
	protected $_quoted = null;
	
	/** @public bool Legacy compatibility */
	protected $_hasQuoted = null;
	
	/**
	* Database object constructor
	*
	* @access	public
	* @param	array	List of options used to configure the connection
	*/
	public function __construct($options) {
		$this->_table_prefix = array_key_exists("prefix", $options) ? $options["prefix"] : "kb_";
		
		// Determine utf-8 support
		$this->_utf = $this->hasUTF();
		
		//Set charsets (needed for MySQL 4.1.2+)
		if ($this->_utf){
			$this->setUTF();
		}
		
		$this->_log = Array();
		$this->_quoted = Array();
		$this->_hasQuoted = false;
	}

	/**
	 * Returns a reference to the global Database object, only creating it if it doesn't already exist.
	 *
	 * @return Database A database object
	*/
	static public function &getInstance($options = Array()) {
		static $instances;
		
		if (!isset($instances)) {
			$instances = Array();
		}
		
		$signature = serialize($options);
		
		if (empty($instances[$signature])) {
			$driver = array_key_exists("driver", $options) ? $options["driver"]	: "mysql";
			
			if (!Core::import("includes.database.drivers." . $driver)) {
				die("Database driver not found.");
			}
			
			$adapter = "Database" . ucfirst($driver);
			$instance = new $adapter($options);
			
			$instances[$signature] = & $instance;
		}
		
		return $instances[$signature];
	}
	
	/**
	 * Database object destructor
	 *
	 * @abstract
	 * @access private
	 * @return boolean
	*/
	function __destruct() {
		return true;
	}
	
	/**
	 * Get the database connectors
	 *
	 * @access public
	 * @return array An array of available session handlers
	*/
	static public function getConnectors() {
		$dir = dir(dirname(__FILE__) . DS . "database");
		$names = Array();
		
		while ($file = $dir->read()) {
			$name = substr($file, 0, strrpos($file, "."));
			Core::import("database.driver." . $name);
			$class = "Database" . ucfirst($name);
			
			if (call_user_func_array(Array(trim($class), "test"), null)) {
				$names[] = $name;
			}
		}
		
		return $names;
	}
	
	/**
	 * Determines if the connection to the server is active.
	 *
	 * @access      public
	 * @return      boolean
	*/
	public function connected() {
		return false;
	}
	
	/**
	 * Determines UTF support
	 *
	 * @abstract
	 * @access public
	 * @return boolean
	*/
	public function hasUTF() {
		return false;
	}
	
	/**
	 * Custom settings for UTF support
	 *
	 * @abstract
	 * @access public
	*/
	public function setUTF() {
		
	}

	/**
	 * Adds a field or array of field names to the list that are to be quoted
	 *
	 * @access public
	 * @param mixed Field name or array of names
	*/
	public function addQuoted($quoted) {
		if (is_string($quoted)) {
			$this->_quoted[] = $quoted;
		} else {
			$this->_quoted = array_merge($this->_quoted, (array)$quoted);
		}
		
		$this->_hasQuoted = true;
	}

	/**
	 * Checks if field name needs to be quoted
	 *
	 * @access public
	 * @param string The field name
	 * @return bool
	*/
	public function isQuoted($fieldName) {
		if ($this->_hasQuoted) {
			return in_array($fieldName, $this->_quoted);
		} else {
			return true;
		}
	}

	/**
	 * Sets the debug level on or off
	 *
	 * @access public
	 * @param int 0 = off, 1 = on
	*/
	public function debug($level) {
		$this->_debug = intval($level);
	}

	/**
	 * Get the database UTF-8 support
	 *
	 * @access public
	 * @return boolean
	*/
	public function getUTFSupport() {
		return $this->_utf;
	}

	/**
	 * Get the error number
	 *
	 * @access public
	 * @return int The error number for the most recent query
	*/
	public function getErrorNum() {
		return $this->_errorNum;
	}


	/**
	 * Get the error message
	 *
	 * @access public
	 * @return string The error message for the most recent query
	*/
	public function getErrorMsg($escaped = false) {
		if ($escaped) {
			return addslashes($this->_errorMsg);
		} else {
			return $this->_errorMsg;
		}
	}
	
	/**
	 * Determines if the last query was successful.
	 *
	 * @access public
	 * @return boolean Success or failure
	*/
	public function success() {
		return !$this->getErrorNum();
	}

	/**
	 * Get a database escaped string
	 *
	 * @abstract
	 * @access public
	 * @return string
	*/
	public function getEscaped($text) {
		return;
	}

	/**
	 * Quote an identifier name (field, table, etc)
	 *
	 * @access public
	 * @param string The name
	 * @return string The quoted name
	*/
	public function nameQuote($s) {
		$q = $this->_nameQuote;
		
		if (strlen($q) == 1) {
			return $q . $s . $q;
		} else {
			return $q{0} . $s . $q{1};
		}
	}
	
	/**
	 * Get the database table prefix
	 *
	 * @access public
	 * @return string The database prefix
	*/
	public function getPrefix() {
		return $this->_table_prefix;
	}

	/**
	 * Get the database null date
	 *
	 * @access public
	 * @return string Quoted null/zero date string
	*/
	public function getNullDate() {
		return $this->_nullDate;
	}

	/**
	 * Sets the SQL query string for later execution.
	 *
	 * This function replaces a string identifier <var>$prefix</var> with the
	 * string held is the <var>_table_prefix</var> class variable.
	 *
	 * @access public
	 * @param string The SQL query
	 * @param string The offset to start selection
	 * @param string The number of results to return
	 * @param string The common table prefix
	*/
	public function setQuery($sql, $offset = 0, $limit = 0, $prefix = "#__") {
		$this->_sql = $this->replacePrefix($sql, $prefix);
		$this->_limit = (int) $limit;
		$this->_offset = (int) $offset;
	}

	/**
	 * This function replaces a string identifier <var>$prefix</var> with the
	 * string held is the <var>_table_prefix</var> class variable.
	 *
	 * @access public
	 * @param string The SQL query
	 * @param string The common table prefix
	*/
	public function replacePrefix($sql, $prefix = "#__") {
		$sql = trim($sql);
		$n = strlen($sql);
		
		$escaped = false;
		$quoteChar = "";
		$startPos = 0;
		$literal = "";
		
		while ($startPos < $n) {
			$ip = strpos($sql, $prefix, $startPos);
			
			if ($ip === false) {
				break;
			}
			
			$j = strpos($sql, "'", $startPos);
			$k = strpos($sql, '"', $startPos);
			
			if (($k !== FALSE) && (($k < $j) || ($j === FALSE))) {
				$quoteChar = '"';
				$j = $k;
			} else {
				$quoteChar = "'";
			}

			if ($j === false) {
				$j = $n;
			}

			$literal .= str_replace($prefix, $this->_table_prefix, substr($sql, $startPos, $j - $startPos));
			$startPos = $j;

			$j = $startPos + 1;

			if ($j >= $n) {
				break;
			}

			// Quote comes first, find end of quote
			while (true) {
				$k = strpos($sql, $quoteChar, $j);
				$escaped = false;
				
				if ($k === false) {
					break;
				}
				
				$l = $k - 1;
				
				while ($l >= 0 && $sql{$l} == "\\") {
					$l--;
					$escaped = !$escaped;
				}
				
				if ($escaped) {
					$j = $k+1;
					continue;
				}
				
				break;
			}
			
			if ($k === false) {
				// Error in the query - no end quote; ignore it
				break;
			}
			
			$literal .= substr($sql, $startPos, $k - $startPos + 1);
			$startPos = $k+1;
		}
		
		if ($startPos < $n) {
			$literal .= substr($sql, $startPos, $n - $startPos);
		}
		
		return $literal;
	}

	/**
	 * Get the active query
	 *
	 * @access public
	 * @return string The current value of the internal SQL variable
	*/
	public function getQuery() {
		return $this->_sql;
	}

	/**
	 * Execute the query
	 *
	 * @abstract
	 * @access public
	 * @return mixed A database resource if successful, FALSE if not.
	*/
	public function query() {
		return;
	}

	/**
	 * Get the affected rows by the most recent query
	 *
	 * @abstract
	 * @access public
	 * @return int The number of affected rows in the previous operation
	*/
	public function getAffectedRows() {
		return;
	}

	/**
	 * Execute a batch query
	 *
	 * @abstract
	 * @access public
	 * @return mixed A database resource if successful, FALSE if not.
	*/
	public function queryBatch($abort_on_error=true, $p_transaction_safe = false) {
		return false;
	}

	/**
	 * Diagnostic function
	 *
	 * @abstract
	 * @access public
	*/
	public function explain() {
		return;
	}

	/**
	 * Get the number of rows returned by the most recent query
	 *
	 * @abstract
	 * @access public
	 * @param object Database resource
	 * @return int The number of rows
	*/
	public function getNumRows($cur = null) {
		return;
	}

	/**
	 * This method loads the first field of the first row returned by the query.
	 *
	 * @abstract
	 * @access public
	 * @return The value returned in the query or null if the query failed.
	*/
	public function loadResult() {
		return;
	}

	/**
	 * Load an array of single field results into an array
	 *
	 * @abstract
	*/
	public function loadResultArray($numinarray = 0) {
		return;
	}

	/**
	 * Fetch a result row as an associative array
	 *
	 * @abstract
	*/
	public function loadAssoc() {
		return;
	}

	/**
	 * Load a associactive list of database rows
	 *
	 * @abstract
	 * @access public
	 * @param string The field name of a primary key
	 * @return array If key is empty as sequential list of returned records.
	*/
	public function loadAssocList($key = "") {
		return;
	}

	/**
	 * This global function loads the first row of a query into an object
	 *
	 *
	 * @abstract
	 * @access public
	 * @param object
	*/
	public function loadObject() {
		return;
	}

	/**
	 * Load a list of database objects
	 *
	 * @abstract
	 * @access public
	 * @param string The field name of a primary key
	 * @return array If <var>key</var> is empty as sequential list of returned records.
	
	 * If <var>key</var> is not empty then the returned array is indexed by the value
	 * the database key.  Returns <var>null</var> if the query fails.
	*/
	public function loadObjectList($key = "") {
		return;
	}

	/**
	 * Load the first row returned by the query
	 *
	 * @abstract
	 * @access public
	 * @return The first row of the query.
	*/
	public function loadRow() {
		return;
	}

	/**
	 * Load a list of database rows (numeric column indexing)
	 *
	 * If <var>key</var> is not empty then the returned array is indexed by the value
	 * the database key.  Returns <var>null</var> if the query fails.
	 *
	 * @abstract
	 * @access public
	 * @param string The field name of a primary key
	 * @return array
	*/
	public function loadRowList($key = "") {
		return;
	}

	/**
	 * Inserts a row into a table based on an objects properties
	 * @param	string	The name of the table
	 * @param	object	An object whose properties match table fields
	 * @param	string	The name of the primary key. If provided the object property is updated.
	*/
	public function insertObject($table, &$object, $keyName = null) {
		return;
	}

	/**
	 * Update ab object in the database
	 *
	 * @abstract
	 * @access public
	 * @param string
	 * @param object
	 * @param string
	 * @param boolean
	*/
	public function updateObject($table, &$object, $keyName, $updateNulls = true) {
		return;
	}

	/**
	 * Print out an error statement
	 *
	 * @param boolean If TRUE, displays the last SQL statement sent to the database
	 * @return string A standised error message
	*/
	public function stderr($showSQL = false) {
		if ($this->_errorNum != 0) {
			return "DB function failed with error number " . $this->_errorNum .
			"<br /><font color=\"red\">" . $this->_errorMsg . "</font>" .
			($showSQL ? "<br />SQL = <pre>" . $this->_sql . "</pre>" : "");
		} else {
			return "DB function reports no errors";
		}
	}

	/**
	 * Get the ID generated from the previous INSERT operation
	 *
	 * @abstract
	 * @access public
	 * @return mixed
	*/
	public function insertId() {
		return;
	}

	/**
	 * Get the database collation
	 *
	 * @abstract
	 * @access public
	 * @return string Collation in use
	*/
	public function getCollation() {
		return;
	}

	/**
	 * Get the version of the database connector
	 *
	 * @abstract
	*/
	public function getVersion() {
		return "Not available for this connector";
	}

	/**
	 * List tables in a database
	 *
	 * @abstract
	 * @access public
	 * @return array A list of all the tables in the database
	*/
	public function getTableList() {
		return;
	}

	/**
	 * 
	 *
	 * @abstract
	 * @access public
	 * @param array A list of table names
	 * @return array A list the create SQL for the tables
	*/
	public function getTableCreate($tables) {
		return;
	}

	/**
	 * List database table fields
	 *
	 * @abstract
	 * @access public
	 * @param array A list of table names
	 * @return array An array of fields by table
	*/
	public function getTableFields($tables) {
		return;
	}
	
	/**
	* Get a quoted database escaped string
	*
	* @access public
	* @return string
	*/
	function quote($text) {
		$text = $this->getEscaped($text);
		
		if (!is_numeric($text)) {
			$text = "'" . $text . "'";
		}
		
		return $text;
	}
}

?>