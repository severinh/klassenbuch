<?php

// Auf diese Datei ist kein direkter Zugriff erlaubt.
defined("_KBSECURE") or die("Access denied.");

Core::import("includes.securesession");
Core::import("includes.json");

class User {
	const OFFLINE = 0;
	const AWAY = 1;
	const ONLINE = 2;
	
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
		static $instance;
		
		if (!$instance) {
			$instance = new User();
		}
		
		return $instance;
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
		$settings = Core::getSettings();
		
		session_name($settings->get("cookieprefix") . "sessionid");
		
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
		$settings = Core::getSettings();
		
		return $this->authenticateByToken(
			$_COOKIE[$settings->get("cookieprefix") . "userid"],
			$_COOKIE[$settings->get("cookieprefix") . "token"]
		);
    }
    
    private function authenticateByJSONRPCRequest() {
		$data = $GLOBALS["HTTP_RAW_POST_DATA"];
		
		if ($data) {
			$json = new Services_JSON(SERVICES_JSON_LOOSE_TYPE);
			$request = $json->decode($data);
			
			if ($request && $request["userid"] && $request["token"]) {
				return $this->authenticateByToken($request["userid"], $request["token"]);
			}
		}
		
		$this->clear();
		return false;
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
		$database = Core::getDatabase();
		
		$database->setQuery("SELECT * FROM #__users WHERE id = " . $database->quote($this->id));
		
		$user = $database->loadAssoc();
		
		if ($database->success() && $user) {
			$this->insertData($user);
			$this->touch();
			
			return true;
		}
		
		return false;
    }
    
    private function insertData($data) {
		$json = new Services_JSON(SERVICES_JSON_LOOSE_TYPE);
		
		$this->id 		   		= (int)    $data["id"];
		$this->nickname    		= (string) $data["nickname"];
		$this->firstname   		= (string) $data["firstname"];
		$this->surname 	   		= (string) $data["surname"];
		$this->address 	   		= (string) $data["address"];
		$this->plz 		   		= (int)    $data["plz"];
		$this->location 		= (string) $data["location"];
		$this->mail 			= (string) $data["mail"];
		$this->phone 			= (string) $data["phone"];
		$this->mobile			= (string) $data["mobile"];
		$this->classmember 		= (bool)   $data["classmember"];
		$this->mainsubject 		= (string) $data["mainsubject"];
		$this->posts 			= (int)    $data["posts"];
		
		$this->password 		= (string) $data["password"];
		$this->token 			= (string) $data["token"];
		
		$this->newpassword 		= (string) $data["newpassword"];
		$this->newpasswordkey 	= (string) $data["newpasswordkey"];
		
		$this->settings			= $json->decode($data["settings"]);
		$this->isadmin 			= (bool)   $data["isadmin"];
		
		return true;
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
	
	public function touch() {
		$database = Core::getDatabase();
		
		$database->setQuery("UPDATE #__users SET " .
			"lastcontact = " . $database->quote(time()) . " WHERE " .
			"id = " 		 . $database->quote($this->id)
		);
		
		return !!$database->query();
	}
	
	public function setState($state) {
        if (!$this->authenticated) {
            return false;
        }
		
		$database = Core::getDatabase();
		
		$database->setQuery("UPDATE #__users SET " .
			"state = " . $database->quote($state) . " WHERE " .
			"id = "    . $database->quote($this->id)
		);
		
		return !!$database->query();
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
        $database = Core::getDatabase();
        $settings = Core::getSettings();
        
        if ($nickname && $password) {
            $database->setQuery("SELECT * FROM #__users WHERE nickname = " . $database->quote($nickname) .
				" AND password = " . $database->quote(md5($password)));
			
			$user = $database->loadAssoc();
			
            if ($database->success() && $user) {
				$this->insertData($user);
				$this->touch();
				$this->setState(self::ONLINE);
				
				session_name($settings->get("cookieprefix") . "sessionid");
                session_start();
                
                $_SESSION["userid"] = $this->id;
                $_SESSION["token"] = $this->token;
                
				setcookie($settings->get("cookieprefix") . "userid", $this->id,    time() + 60 * 60 * 24 * 30);
				setcookie($settings->get("cookieprefix") . "token",  $this->token, time() + 60 * 60 * 24 * 30);
				
                $this->authenticated = true;
                
                return true;
            }
        }
        
        return false;
    }
    
    public function signOut() {
		$database = Core::getDatabase();
		$settings = Core::getSettings();
		
		$this->setState(self::OFFLINE);
		$this->clear();
		session_destroy();
		
		setcookie($settings->get("cookieprefix") . "sessionid",  "", time() - 3600);
		setcookie($settings->get("cookieprefix") . "userid", 	 "", time() - 3600);
		setcookie($settings->get("cookieprefix") . "token", 	 "", time() - 3600);
		
		return true;
    }
    
    public function update($information) {
        $database = Core::getDatabase();
		
        if (!$information || !$this->authenticated) {
            return false;
        }
		
		$regExpPLZ = "/^[1-9]\d{3}$/";
		$regExpPhone = "/^(0\d{2} \d{3}( \d\d){2})|(0\d{9})|(\+[1-9]\d{10})$/";
		$regExpMail = "/^[a-zA-Z0-9]+[_a-zA-Z0-9-]*(\.[_a-z0-9-]+)*@[a-z??????0-9]+(-[a-z??????0-9]+)*(\.[a-z??????0-9-]+)*(\.[a-z]{2,4})$/";
		
        $allowedFields = Array("firstname", "surname", "address", "plz", "location", "phone", "mobile", "mail", "posts");
        $requiredFields = Array("firstname", "surname");
		
        $error = false;
 		$query = "";
 		
        foreach ($information as $key => $value) {
			if ((in_array($key, $requiredFields) && empty($value)) ||
				!in_array($key, $allowedFields) ||
				($key === "plz" && !preg_match($regExpPLZ, $value) && !empty($value)) ||
				(($key === "phone" || $key === "mobile") && !empty($value) && !preg_match($regExpPhone, $value))) {
				return false;
            }
            
            if (!$error) {
				$query .= ", " . $key . " = " . $database->quote($value);
			}
        }
        
		if (!$query) {
			return false;
		}
		
		$query = substr($query, 2);
		
		$database->setQuery("UPDATE #__users SET " . $query . " WHERE id = " . $database->quote($this->id));
		
		if (!$database->query()) {
			return false;
		}
		
		foreach ($information as $key => $value) {
			$this->$key = $value;
		}
		
		return true;
    }
    
    public function saveSettings() {
		$database = Core::getDatabase();
		
        if (!$this->authenticated) {
            return false;
        }
        
        $json = new Services_JSON();
        $settings = $json->encode($this->settings);
        
		$database->setQuery("UPDATE #__users SET " .
			"settings = " . $database->quote($settings) . " WHERE " .
			"id = " . $database->quote($this->id)
		);
		
        return !!$database->query();
    }
}

?>