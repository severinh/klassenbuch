<?php

// Auf diese Datei ist kein direkter Zugriff erlaubt.
defined("_KBSECURE") or die("Zugriff verweigert.");

require_once("server.securesession.php");

class User {
	static private $instance = null;
	
    public $_secureSession = null;
    public $authenticated = false;
    
    public $id = null;
    public $nickname = null;
    public $firstname = null;
    public $surname = null;
    public $address = null;
    public $plz = null;
    public $location = null;
    public $mail = null;
    public $phone = null;
    public $mobile = null;
    public $classmember = null;
    public $mainsubject = null;
    
    public $password = null;
    public $token = null;
    public $newpassword = null;
    public $newpasswordkey = null;
    
    public $isadmin = false;
	public $settings = null;
	
	static public function &getInstance() {
		if (!self::$instance) {
			self::$instance = new User();
		}
		
		return self::$instance;
	}
    
    private function __construct() {
		$this->_secureSession = true;
		$this->authenticated = false;
		$this->settings = Array();
		
		if (!$this->authenticate()) {
			$this->clear();
		}
    }
    
    private function setupSession() {
		$settings = Settings::getInstance();
		
		session_name($settings->cookieprefix . "sessionid");
		
		if ("files" != ini_get("session.save_handler")) {
			ini_set("session.save_handler", "files");
		}
		
		session_cache_limiter("private, must-revalidate");
		session_start();
		
		$this->_secureSession = new SecureSession();
		$this->_secureSession->check_ip_blocks = 0;
		$this->_secureSession->secure_word = "4ce0bc0131";
		$this->_secureSession->regenerate_id = false;
		$this->_secureSession->check_browser = false;
    }
    
    public function authenticate() {
		if ($this->authenticated ||
			$this->authenticateBySession() ||
			$this->authenticateByCookie() ||
			$this->authenticateByJSONRPCRequest() ||
			$this->authenticateByPOSTParams()) {
			$this->authenticated = true;
			return true;
		}
		
        return false;
    }
    
    private function authenticateBySession() {
		$this->setupSession();
		
		if (!$this->_secureSession->Check()) {
			return false;
		}
		
		return $this->authenticateByToken($_SESSION["userid"], $_SESSION["token"]);
    }
    
    private function authenticateByCookie() {
		$settings = Settings::getInstance();
		
		return $this->authenticateByToken(
			$_COOKIE[$settings->cookieprefix . "userid"],
			$_COOKIE[$settings->cookieprefix . "token"]
		);
    }
    
    private function authenticateByJSONRPCRequest() {
		if (isset($GLOBALS["_xh"]) && isset($GLOBALS["_xh"]["value"])) {
			$data = $GLOBALS["_xh"]["value"];
			
			return $this->authenticateByToken($data["userid"], $data["token"]);
		} else {
			$this->clear();
			return false;
		}
    }
    
    private function authenticateByPOSTParams() {
		return $this->authenticateByToken($_POST["userid"], $_POST["token"]);
    }
    
    private function authenticateByToken($id = 0, $token = "") {
		$id = intval($id);
		
		if ($id > 0 && $token) {
			$this->id = $id;
			
			if ($this->loadFromDatabase() && $this->token === $token) {
				return true;
			}
		}
		
		$this->clear();
		return false;
    }
    
    private function loadFromDatabase() {
		global $database;
		
		$settings = Settings::getInstance();
		
		$response = $database->query("SELECT * FROM " . $settings->db_tblprefix . "users WHERE id = " .
			mySQLValue($this->id));
		
		if (!$response || mysql_num_rows($response) == 1) {
			return false;
		}
		
		return $this->insertData(mysql_fetch_array($response));
    }
    
    private function insertData($data) {
		$json = new Services_JSON(SERVICES_JSON_LOOSE_TYPE);
		
		if ($data !== false) {
			$this->id 		   	= (int)    $data["id"];
			$this->nickname    	= (string) $data["nickname"];
			$this->firstname   	= (string) $data["firstname"];
			$this->surname 	   	= (string) $data["surname"];
			$this->address 	   	= (string) $data["address"];
			$this->plz 		   	= (int)    $data["plz"];
			$this->location 	= (string) $data["location"];
			$this->mail 		= (string) $data["mail"];
			$this->phone 		= (string) $data["phone"];
			$this->mobile		= (string) $data["mobile"];
			$this->classmember 	= (bool)   $data["classmember"];
			$this->mainsubject 	= (string) $data["mainsubject"];
			$this->posts 		= (int)    $data["posts"];
			
			$this->password 	= (string) $data["password"];
			$this->token 		= (string) $data["token"];
			
			$this->newpassword 	= (string) $data["newpassword"];
			$this->newpasswordkey = (string) $data["newpasswordkey"];
			
			$this->settings		= $json->decode($data["settings"]);
			
			$this->isadmin 		= (bool)   $data["isadmin"];
			
			return true;
		} else {
			$this->clear();
			return false;
		}
    }
    
    private function clear() {
		$this->authenticated = false;
		
		$this->id = 0;
		$this->nickname = "";
		$this->firstname = "";
		$this->surname = "";
		$this->address = "";
		$this->plz = 0;
		$this->location = "";
		$this->mail = "";
		$this->phone = "";
		$this->mobile = "";
		$this->mainsubject = "";
		$this->classmember = false;
		$this->posts = 0;
		
		$this->password = "";
		$this->token = "";
		$this->newpassword = "";
		$this->newpasswordkey = "";
		
		$this->settings = Array();
		
		$this->isadmin = false;
	}
    
	public function getSessionID() {
        if ($this->authenticated) {
            return session_id();
        }
        
        return false;
    }
    
    public function getProfile() {
        if ($this->authenticated) {
            return Array(
				"firstname"	  => $this->firstname,
				"surname"	  => $this->surname,
				"address"	  => $this->address,
				"plz"		  => $this->plz,
				"location"	  => $this->location,
				"mail"		  => $this->mail,
				"phone"		  => $this->phone,
				"mobile"	  => $this->mobile,
				"mainsubject" => $this->mainsubject,
				"classmember" => $this->classmember,
				"posts" 	  => $this->posts,
            );
        }
        
        return false;
    }
    
    public function signIn($nickname, $password) {
        global $database;
        
        $settings = Settings::getInstance();
        
        if ($nickname && $password) {
            $data = $database->query("SELECT * FROM " . $settings->db_tblprefix . "users WHERE nickname = " .
				mySQLValue($nickname) . " AND password = " . mySQLValue(md5($password)));
			
            if ($data && mysql_num_rows($data) == 1) {
				$this->insertData(mysql_fetch_array($data));
				
				session_name($settings->cookieprefix . "sessionid");
                session_start();
                
                $_SESSION["userid"] = $this->id;
                $_SESSION["token"] = $this->token;
                
				setcookie($settings->cookieprefix . "userid", $this->id, time() + 60 * 60 * 24 * 30);
				setcookie($settings->cookieprefix . "token", $this->token, time() + 60 * 60 * 24 * 30);
				
                $this->authenticated = true;
                
                return true;
            }
        }
        
        return false;
    }
    
    public function signOut() {
		global $database;
		
		$settings = Settings::getInstance();
		
		$this->clear();
		session_destroy();
		
		setcookie($settings->cookieprefix . "sessionid",  "", time() - 3600);
		setcookie($settings->cookieprefix . "userid", "", time() - 3600);
		setcookie($settings->cookieprefix . "token", "", time() - 3600);
		
		return true;
    }
    
    public function update($information) {
        global $database;
		
		$settings = Settings::getInstance();
		
        if (!$information || !$this->authenticated) {
            return false;
        }
		
		$regExpPLZ = "/^[1-9]\d{3}$/";
		$regExpPhone = "/^(0\d{2} \d{3}( \d\d){2})|(0\d{9})|(\+[1-9]\d{10})$/";
		$regExpMail = "/^[a-zA-Z0-9]+[_a-zA-Z0-9-]*(\.[_a-z0-9-]+)*@[a-z??????0-9]+(-[a-z??????0-9]+)*(\.[a-z??????0-9-]+)*(\.[a-z]{2,4})$/";
		
        $allowedFields = Array("firstname", "surname", "address", "plz", "location", "phone", "mobile", "mail", "posts");
        
        $error = false;
 		$query = "";
 		
        foreach ($information as $key => $value) {
			if (empty($value)) {
				$error = true;
            }
            
            if (!in_array($key, $allowedFields)) {
				$error = true;
            }
            
            if ($key === "plz" && !preg_match($regExpPLZ, $value)) {
				$error = true;
            }
            
            if (($key === "phone" || $key === "mobile") && !preg_match($regExpPhone, $value)) {
				$error = true;
            }
            
            if (!$error) {
				$query .= ", $key = " . mySQLValue($value);
			}
        }
        
		if (empty($query)) {
			return false;
		}
		
		$query = substr($query, 2);
		
        if ($error) {
			return false;
		}
	
		if (!$database->query("UPDATE " . $settings->db_tblprefix . "users SET " . $query . " WHERE id = " .
			mySQLValue($this->id))) {
			return false;
		}
		
		foreach ($information as $key => $value) {
			$this->$key = $value;
		}
		
		return true;
    }
    
    public function saveSettings() {
		global $database;
		
        if (!$this->authenticated) {
            return false;
        }
        
        $json = new Services_JSON();
        $settings = $json->encode($this->settings);
        
        if ($database->query("UPDATE users SET settings = " . mySQLValue($settings) . " WHERE id = " .
			mySQLValue($this->id))) {
			return true;
		} else {
			return false;
		}
    }
}

?>