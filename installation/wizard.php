<?
/*
NBBS Wizard - Wizard Component & Installation Wizard
Extracted from: The Next BBS - Forums Software
Copyright (C) 2005 Chris F. Ravenscroft

This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 2 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program; if not, write to the Free Software Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA

Questions? We can be reached at http://forums.sf.net
*/

require_once("../server.template.php");

class Wizard {
	var	$wizard;
	var $pages;
	var $page;
	var $pagename;
	var $pageFields;
	var $mainPage;
	var $cancelCaption;
	var $cancelPage;
	var $nextCaption;
	var $nextPage;
	var $prevCaption;
	var $prevPage;
	var $submitCaption;
	var $submitPage;
	var $title;
	var $width;
	var $height;
	var $defaults;
	var $DB;
	var $bProgress;
	var $mode;
	var $out;

	/**
	 * Constructor.
	 * @param pagename the wizard card's name - null if this is the main wizard card itself and not a subclass
	 */
	function Wizard($pagename = null) {
		/** This is the prefix that this class will look for to maintain variables persistency */
		if (!defined("PREFIX"))			define("PREFIX", "wiz_");
		/** In this mode, the wizard component will be displayed by this class */
		if (!defined("MODE_RENDER"))	define("MODE_RENDER", 0x01);
		/** In this mode, this class will create the wizard component but not display it */
		if (!defined("MODE_BUFFER"))	define("MODE_BUFFER", 0x02);
		/** In this mode, headers and footers will not be displayed */
		if (!defined("MODE_EMBED"))		define("MODE_EMBED",  0x04);

		/** The wizard's pages, AKA 'cards' */
		$this->pages = array();
		$this->pagename = $pagename;
		$this->nextPage =
		$this->prevPage =
		$this->submitPage =
		$this->mainPage =
		$this->wizard =
			null;
		
		$this->cancelCaption = "Abbrechen";
		$this->nextCaption = "Weiter";
		$this->prevCaption = "Zurück";
		$this->submitCaption = "OK";
		$this->cancelPage = true;
		$this->title = "Assistent";
		/** Default form fields values */
		$this->defaults = array();
		/** By default, we are not displaying a progress bar */
		$this->bProgress = false;
		$this->mode = MODE_RENDER;
		/** Output buffer */
		$this->out = "";

		$this->init();
	}

	// ---------------------------------------------------------------------------
	// ---------------------------------------------------------------------------
	// Main wizard class' methods - not for cards
	// ---------------------------------------------------------------------------
	// ---------------------------------------------------------------------------

	/* Display an error message and die
	 * @param e String: an error message
	 * @param g String: where could we go back to?
	 */
	function throwError($e, $g = null) {
		$tmpl = new Template;
		$tmpl->read_file("installation.tmpl");
		
		$tmpl->set_var("WIZARDTITLE", "Fehler!");
		$tmpl->set_var("WIZARDBODY", $e);
		$tmpl->set_var("WIZARDBUTTONS", "");
		
		$tmpl->parse();
		
		die($tmpl->get_template());
	}

	/**
	 * Set the wizard mode - method of the main wizard class
	 * @param mode Can be MODE_EMBED (no header/footer), MODE_RENDER (display) or MODE_BUFFER (return buffer)
	 */
	function setMode($mode) {
		$this->mode = $mode;
	}

	/**
	 * Add a card to the main wizard's cards table
	 * @param key Card name
	 * @param page The card class itself
	 */
	function addPage($key, $page) {
		$page->_setWizard(&$this);
		$this->pages[$key] = &$page;
		
		if ($this->mainPage == null) {
			$this->setMainPage($key);
		}
	}

	/**
	 * Set a custom main page, rather than the first one
	 * @param key Card name
	 */
	function setMainPage($key) {
		$this->mainPage = $key;
	}

	/**
	 * Display the wizard: always call last.
	 * @return Buffer's content
	 */
	function display() {
		$pName = &$this->pagename;

		// What button was clicked?
		if (isset($_REQUEST["cancel"])) {
			
		} else if (isset($_REQUEST["prev"]) && isset($_REQUEST["onprev"])) {
			$pName = $_REQUEST["onprev"];
		} else if (isset($_REQUEST["next"]) && isset($_REQUEST["onnext"])) {
			$pName = $_REQUEST["onnext"];
		} else if (isset($_REQUEST["autosubmit"])) {
			$pName = $_REQUEST["autosubmit"];
		} else if (isset($_REQUEST["oksubmit"])) {
			
		}
		// Is there any kind of post-processing we should care about?
		if (isset($_REQUEST["pagename"])) {
			if (isset($this->pages[$_REQUEST["pagename"]])) {
				$pcard = $this->pages[$_REQUEST["pagename"]];
				if (method_exists($pcard, "action")) {
					$pcard->action();
				}
			}
		}
		
		// Name of the page to display
		if (!isset($this->pages[$pName])) {
			// Use default page!
			$pName = &$this->mainPage;
			
			if (!isset($this->pages[$pName])) {
				$this->throwError("Seite $pName existiert nicht!");
			}
		}
		
		// Reqrite
		$card = &$this->pages[$pName];
		$card->displayLayout();

		if (MODE_RENDER == ($this->mode & MODE_RENDER)) {
			$card->_render();
		}

		// Nice when using MODE_BUFFER
		return $this->out;
	}

	/**
	 * Private: display the wizard (for real!)
	 */
	function _render() {
		print $this->out;
	}

	// ---------------------------------------------------------------------------
	// ---------------------------------------------------------------------------
	// Wizard card's methods - handle default fields
	// ---------------------------------------------------------------------------
	// ---------------------------------------------------------------------------

	/**
	 * Set default values for given form fields
	 * @param blob An associative array of fields names and values
	 */
	function setDefaults($blob) {
		foreach($blob as $key => $value) {
			$this->setDefault($key, $value);
		}
	}

	/**
	 * Set a default value for a form field
	 * @param key Field name
	 * @param value Fiel's default value
	 */
	function setDefault($key, $value) {
		$this->defaults[$key] = $value;
	}

	/**
	 * Return a field's default value
	 * @param key Field name
	 * @return A default string value, of null if no default value was set
	 */
	function getDefault($key) {
		if (isset($this->defaults[$key])) {
			return $this->defaults[$key];
		} else {
			return null;
		}
	}

	// ---------------------------------------------------------------------------
	// ---------------------------------------------------------------------------
	// Wizard card's methods - handle all variables
	// ---------------------------------------------------------------------------
	// ---------------------------------------------------------------------------

	/**
	 * Return a variable's current value
	 * @param varname Variable name
	 * @return Variable's value of null
	 */
	function getVar($varname) {
		if (!isset($_REQUEST[$varname])) {
			return null;
		}
		
		return $_REQUEST[$varname];
	}

	/**
	 * Return an associate array of all correctly prefixed variables names and their respective values
	 * @return An associative array
	 */
	function getVars() {
		$ret = array();
		
		foreach($_REQUEST as $varname => $varvalue) {
			$p = strpos($varname, PREFIX);
			if ($p!==false && $p==0) {
				$ret[$varname] = $varvalue;
			}
		}
		
		return $ret;
	}

	/**
	 * Set a user variable name. These variables are different because they are not set through form submission
	 * @param varname User variable name
	 * @param varvalue Variable's value
	 */
	function setUserVariable($varname, $varvalue) {
		$_REQUEST["wiz_uv_" . $varname] = $varvalue;
	}

	/**
	 * Return a user variable name
	 * @param varname User variable name
	 * @return The user variable's value, or null
	 */
	function getUserVariable($varname) {
		$actualname = "wiz_uv_" . $varname;
		
		if (!isset($_REQUEST[$actualname])) {
			return null;
		}
		
		return $_REQUEST[$actualname];
	}

	/**
	 * Private: tells a card what its main wizard class is
	 */
	function _setWizard($wizard) {
		$this->wizard = &$wizard;
	}

	/**
	 * Display progress card
	 */
	function displayProgress() {
		$ne = $this->getVar("next");
		
		if ($ne != null) {
			if ($this->wizard == null) {
				$this->bProgress = true;
			} else {
				$this->wizard->displayProgress();
			}
		}

	}

	/**
	 * Set the card's title
	 * @param title A title string
	 */
	function setTitle($title) {
		$this->title = $title;
	}

	// ---------------------------------------------------------------------------
	// ---------------------------------------------------------------------------
	// Wizard card's methods - override these at will
	// ---------------------------------------------------------------------------
	// ---------------------------------------------------------------------------

	/**
	 * Display the overall wizard + current card layout.
	 * Override this method if you wish to use your own layout
	 */
	function displayLayout() {
		$tmpl = new Template;
		$tmpl->read_file("installation.tmpl");
		
		$tmpl->set_var("WIZARDBODY", $this->_getPageBody());
		$tmpl->set_var("WIZARDBUTTONS", $this->_getButtons());
		$tmpl->set_var("WIZARDTITLE", $this->title);
		
		$tmpl->parse();
		
		$this->out .= $tmpl->get_template();
	}

	/**
	 * This definitely is _the_ method you want to override. You card's content goes here.
	 */
	function setPage() {
		$this->page = "* Do not forget to override setPage() *'";
	}

	/** This method is called after clicking a navigation button
	 * ONLY create it if you need some post-processing to happen
	function action()
	{
	}
	*/

	// ---------------------------------------------------------------------------
	// ---------------------------------------------------------------------------
	// Wizard card's methods - buttons panel management
	// ---------------------------------------------------------------------------
	// ---------------------------------------------------------------------------

	/**
	 * Set caption of 'Cancel' button
	 * @param caption Button caption
	 */
	function setCancelCaption($caption) {
		$this->cancelCaption = $caption;
	}

	/**
	 * Set page to go to when the 'Cancel' button is clicked
	 * @param page Card's name
	 */
	function setCancel($page) {
		$this->cancelPage = $page;
	}

	/**
	 * Set caption of 'Next' button
	 * @param caption Button caption
	 */
	function setNextCaption($caption) {
		$this->nextCaption = $caption;
	}

	/**
	 * Set page to go to when the 'Next' button is clicked
	 * @param page Card's name
	 */
	function setNext($page) {
		$this->nextPage = $page;
	}

	/**
	 * Set caption of 'Prev' button
	 * @param caption Button caption
	 */
	function setPrevCaption($caption) {
		$this->prevCaption = $caption;
	}

	/**
	 * Set page to go to when the 'Prev' button is clicked
	 * @param page Card's name
	 */
	function setPrev($page) {
		$this->prevPage = $page;
	}

	/**
	 * Set caption of 'Submit' button
	 * @param caption Button caption
	 */
	function setSubmitCaption($caption) {
		$this->submitCaption = $caption;
	}

	/**
	 * Set page to go to when the 'Submit' button is clicked
	 * @param page Card's name
	 */
	function setSubmit($page) {
		$this->submitPage = $page;
	}

	// ---------------------------------------------------------------------------
	// ---------------------------------------------------------------------------
	// Wizard card's methods - internal helper classes
	// ---------------------------------------------------------------------------
	// ---------------------------------------------------------------------------

	/**
	 * Private: Prepare component code.
	 */
	
	function _getPageBody() {
		$p = $this->wizard == null ? $this->bProgress : $this->wizard->bProgress;
		
		$this->setPage();
		
		$out =  $this->page;
		
		// Various input fields...
		// 1-current page name
		$hf = "<input type=\"hidden\" name=\"pagename\" value=\"" . $this->pagename . "\">";
		
		// Get POST vars
		$vars = &$this->getVars();
		preg_match_all('[\*(wiz_.+?)\*]', $out, $usedstruct);
		$used = &$usedstruct[1];
		
		// 2-check for all variables
		// Look for composed variables
		$repfrom = array();
		$repto = array();
		$displayed = array();
		
		foreach ($used as $tupple) {
			$u = explode(".", $tupple);
			// Do we know this variable?
			if (isset($vars[$u[0]])) {
				if (count($u) < 2) {
					$repfrom[] = "[*$tupple*]";
					$repto[] = $vars[$u[0]];
				} else {
					$repfrom[] = "[*$tupple*]";
					if ($tupple == $u[0] . "." . $vars[$u[0]]) {
						$repto[] = "checked selected";
					} else {
						$repto[] = "";
					}
				}
				
				$displayed[$u[0]] = true;
			} else {
				if (count($u) < 2) {
					$repfrom[] = "[*$tupple*]";
					$def = &$this->getDefault($tupple);
					$repto[] = $def == null ? "" : $def;
				} else {
				}
			}
		}
		
		$out = str_replace($repfrom, $repto, $out);
		
		// 3-store various variables
		foreach($vars as $key => $value) {
			if (isset($displayed[$key])) {
				continue;
			}
			
			// Not displayed yet...just hide it
			$hf .= "<input type=\"hidden\" name=\"" . $key . "\" value=\"" . $value . "\">";
		}
		
		// Done
		return "<form method=\"post\" action=\"{$_SERVER['PHP_SELF']}\" id=\"wizardForm\">" . $hf . $out;
	}

	/**
	 * Private: 'display' buttons panel
	 */
	function _getButtons() {
		$b_out = "<div id=\"buttons\">";
		
		if ($this->prevPage) {
			$b_out .= "<input type=\"hidden\" name=\"onprev\" value=\"" . 
				$this->prevPage. "\"><input type=\"submit\" id=\"prevButton\" name=\"prev\" tabindex=\"1\" value=\"" . 
				$this->prevCaption . "\">";
		}
		
		if ($this->nextPage) {
			$b_out .= "<input type=\"hidden\" name=\"onnext\" tabindex=\"0\" value=\"" . 
				$this->nextPage . "\"><input type=\"submit\" id=\"nextButton\" name=\"next\" value=\"" .
				$this->nextCaption . "\">";
		}
		
		$b_out .= "</div>";
		
		return $b_out;
	}

	// ---------------------------------------------------------------------------
	// ---------------------------------------------------------------------------
	// Installation Wizard - coder helper methods - use 'em!
	// ---------------------------------------------------------------------------
	// ---------------------------------------------------------------------------

	/**
	 * Return a password
	 * @return a password, 6 characters.
	 */
	function getNewPassword() {
		return substr(md5(time()), 0, 6);
	}

	/**
	 * Low level: open database and return a handle
	 * @param dbhost DB Server hostname
	 * @param dbname Database name
	 * @param dbuser Database user name
	 * @param dbpassword Database user password
	 * @return Database handler
	 */
	function opendb($dbhost, $dbname, $dbuser, $dbpassword) {
		$this->DB = mysql_connect(
			$dbhost,
			$dbuser,
			$dbpassword
		);
		
		if (!$this->DB) {
			return false;
		}
		
		if (!mysql_select_db($dbname, $this->DB)) {
			return false;
		}
		
		return true;
	}

	/**
	 * Low level: perform a database query
	 * @param qry Query text
	 * @return A resultset
	 */
	function dbquery($qry) {
		return mysql_query($qry, $this->DB);
	}

	/**
	 * High level: check a database user's privileges
	 * @return An associative array of privileges=>booleans
	 */
	function checkdb() {
		$diags = Array(
			"Connect" => false,
			"Create" => false,
			"Insert" => false,
			"Update" => false,
			"Select" => false,
			"Delete" => false,
			"Drop" => false);
		
		if (!$this->DB) {
			return $diags;
		}
		
		$diags["Connect"] = true;
		
		if (!$this->dbquery("CREATE TABLE nwiztestdropme(afield integer(10))")) {
			return $diags;
		}
		
		$diags["Create"] = true;
		
		if (!$this->dbquery("INSERT INTO nwiztestdropme(afield) VALUES('1')")) {
			return $diags;
		}
		
		$diags["Insert"] = true;
		
		if (!$this->dbquery("UPDATE nwiztestdropme SET afield='2'")) {
			return $diags;
		}
		
		$diags["Update"] = true;
		
		if (!$this->dbquery("SELECT * FROM nwiztestdropme")) {
			return $diags;
		}
		
		$diags["Select"] = true;
		
		if (!$this->dbquery("DELETE FROM nwiztestdropme")) {
			return $diags;
		}
		
		$diags["Delete"] = true;
		
		if (!$this->dbquery("DROP TABLE nwiztestdropme")) {
			return $diags;
		}
		
		$diags["Drop"] = true;
		
		return $diags;
	}

	/**
	 * High level: Import an SQL file
	 * @param filename Name of the file to import
	 * @param oldprefix Tables prefix to be replaced in the import file
	 * @param dbprefix Prefix to replace the old prefix with
	 * @param substitutions An associative array of values to dynamically replace while importing the file
	 * @return String: 'OK' upon success, another string otherwise.
	 */
	function importdb($filename, $oldprefix, $dbprefix, $substitutions = Array()) {
		if (!$this->DB) {
			return false;
		}
		
		$fromvals = $tovals = Array();
		
		foreach($substitutions as $fromval => $toval) {
			$fromvals[] = $fromval;
			$tovals[] = $toval;
		}
		
		$queries = Array();
		$f = fopen($filename, "r");
		$qry = "";
		
		while (!feof($f)) {
			$sql = fgets($f, 65535);
			$l = strlen($sql);
			
			while(ord($sql[$l-1]) < 32 && $l > 1) {
				$l--;
			}
			
			$sql = substr($sql, 0, $l);
			
			if (strlen($sql) < 2 || $sql[0] == "-") {
				continue;
			}
			
			$qry .= $sql;
			
			if ($sql[$l-1] == ";") {
				$qry = str_replace($oldprefix, $dbprefix, $qry);
				$qry = str_replace($fromvals, $tovals, $qry);
				$queries[] = $qry;
				$qry = "";
			}
		}
		
		fclose($f);
		
		for($i = 0; $i < count($queries); $i++) {
			if (!$this->dbquery($queries[$i])) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Create a directory. Will recursively create all directories required.
	 * @param dirname Directory full path
	 * @return false upon failure; true otherwise.
	 */
	function mkdir($dirname) {
		if (@is_dir($dirname) || @empty($dirname)) {
			return true;
		}

		$subdirname = substr($dirname, 0, strrpos($dirname, DIRECTORY_SEPARATOR));
		if ($this->mkdir($subdirname)) {
			if (!@file_exists($dirname)) {
				return @mkdir($dirname);
			}
		}
	}

	/**
	 * Remove a directory.
	 * @param dirname Directory full path
	 * @return false upon failure; true otherwise.
	 */
	function rmdir($dirname) {
		return @rmdir($dirname);
	}

	/**
	 * Change a file's access mode
	 * @param filename File name
	 * @return false upon failure; true otherwise.
	 */
	function chmod($filename, $mode) {
		return @chmod($filename, $mode);
	}

	/**
	 * Suck in the content of a file
	 * @param file String: name of the file to read
	 * @return String the file content, or false.
	 */
	function readFile($filename) {
		$f = @fopen($filename, "r");
		
		if (!$f) {
			return false;
		}
		
		$contents = fread($f, filesize($filename));
		fclose($f);
		return $contents;
	}

	/**
	 * Write a file to disk
	 * @param filename String: name of the file to write
	 * @param contents String: the new file contents
	 * @return false upon failure; true otherwise.
	 */
	function writeFile($filename, $contents) {
		$f = @fopen($filename, "w");
		
		if (!$f) {
			return false;
		}
		
		if (!fwrite($f, $contents)) {
			fclose($f);
			return false;
		}
		
		fclose($f);
		return true;
	}

	/**
	 * Delete a file
	 * @param filename String: name of the file to delete
	 * @return false upon failure; true otherwise.
	 */
	function deletefile($filename) {
		return @unlink($filename);
	}
}

?>
