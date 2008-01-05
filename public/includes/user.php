<?php

// Auf diese Datei ist kein direkter Zugriff erlaubt.
defined("_KBSECURE") or die("Access denied.");

Core::import("includes.securesession");
Core::import("includes.database.table");
Core::import("includes.database.tables.users");

class User extends TableUsers {
	const OFFLINE = 0;
	const AWAY = 1;
	const ONLINE = 2;
	
	private $_secureSession = null;
	private $_authenticated = false;

	public function __construct($db) {
		parent::__construct($db);
	
		if (!$this->authenticate()) {
			$this->reset();
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
		if ($this->_authenticated ||
			$this->authenticateBySession() ||
			$this->authenticateByCookie() ||
			$this->authenticateByJSONRPCRequest() ||
			$this->authenticateByPOSTParams()) {
			$this->_authenticated = true;
			$this->touch();
		
			return true;
		}
	
	  return false;
	}
	
	public function authenticated() {
		return $this->_authenticated;
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
	
		$this->reset();
		return false;
	}
    
	private function authenticateByPOSTParams() {
		return $this->authenticateByToken($_POST["userid"], $_POST["token"]);
	}

	private function authenticateByToken($id = 0, $token = "") {
		$id = intval($id);
	
		if ($id > 0 && $token) {
			$this->id = $id;
		
			if ($this->load() && $this->token === $token) {
				return true;
			}
		}
	
		$this->reset();
		return false;
	}
    
	public function reset() {
		$this->_authenticated = false;
		
		parent::reset();
	}
	
	public function touch() {
		if ($this->_authenticated) {
			return $this->save(Array("lastcontact" => time()));
		}
		
		return false;
	}
	
	public function setState($state) {
		if ($this->_authenticated) {
			return $this->save(Array("state" => $state));
		}
		
		return false;
	}
    
	public function getSessionID() {
		if ($this->_authenticated) {
			return session_id();
		}

		return false;
	}
    
	public function getProfile() {
		if ($this->_authenticated) {
			return Array(
				"firstname"   => $this->firstname,
				"surname"     => $this->surname,
				"address"     => $this->address,
				"plz"         => $this->plz,
				"location"    => $this->location,
				"mail"        => $this->mail,
				"phone"       => $this->phone,
				"mobile"      => $this->mobile,
				"mainsubject" => $this->mainsubject,
				"classmember" => $this->classmember,
				"posts"       => $this->posts
			);
		}

		return false;
	}
	
	public function getSettings() {
		if ($this->_authenticated) {
			$json = new Services_JSON(SERVICES_JSON_LOOSE_TYPE);

			return $json->decode($this->settings);
		}

		return false;
	}
    
	public function signIn($nickname, $password) {
		$settings = Core::getSettings();

		if ($nickname && $password) {
			$this->_db->setQuery("SELECT * FROM #__users WHERE " .
				"nickname = " . $this->_db->quote($nickname) . " AND " .
				"password = " . $this->_db->quote(md5($password))
			);

			$user = $this->_db->loadAssoc();

			if ($this->_db->success() && $user) {
				$this->bind($user);
				$this->touch();
				$this->setState(self::ONLINE);

				session_name($settings->get("cookieprefix") . "sessionid");
				session_start();

				$_SESSION["userid"] = $this->id;
				$_SESSION["token"] = $this->token;

				setcookie($settings->get("cookieprefix") . "userid", $this->id,    time() + 60 * 60 * 24 * 30);
				setcookie($settings->get("cookieprefix") . "token",  $this->token, time() + 60 * 60 * 24 * 30);

				$this->_authenticated = true;

				return true;
			}
		}

		return false;
	}
	
	public function updateProfile($profile) {
		if ($this->_authenticated) {
			$allowedFields = Array("firstname", "surname", "mail", "address", "plz", "location", "phone", "mobile");
			$securedProfile = Array();

			foreach($allowedFields as $field) {
				if ($profile[$field]) {
					$securedProfile[$field] = $profile[$field];
				}
			}

			return $this->save($securedProfile);
		}

		return false;
	}
    
	public function signOut() {
		$settings = Core::getSettings();
	
		$this->setState(self::OFFLINE);
		$this->reset();
		session_destroy();
	
		setcookie($settings->get("cookieprefix") . "sessionid",  "", time() - 3600);
		setcookie($settings->get("cookieprefix") . "userid", 	 "", time() - 3600);
		setcookie($settings->get("cookieprefix") . "token", 	 "", time() - 3600);
	
		return true;
	}
}

?>
