<?php

/*
 * Klassenbuch
 * JSONRPCService: Based on XML-RPC for PHP (http://phpxmlrpc.sourceforge.net/)
 * Copyright (C) 2006 - 2008 Severin Heiniger
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

// By Edd Dumbill (C) 1999-2002
// <edd@usefulinc.com>
// 
// Copyright (c) 1999, 2000, 2002 Edd Dumbill.
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
//
//    * Redistributions of source code must retain the above copyright
//      notice, this list of conditions and the following disclaimer.
//
//    * Redistributions in binary form must reproduce the above
//      copyright notice, this list of conditions and the following
//      disclaimer in the documentation and/or other materials provided
//      with the distribution.
//
//    * Neither the name of the "XML-RPC for PHP" nor the names of its
//      contributors may be used to endorse or promote products derived
//      from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// REGENTS OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
// HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
// STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
// OF THE POSSIBILITY OF SUCH DAMAGE.

Core::import("includes.jsonrpc.response");
Core::import("includes.json");

class JSONRPCService {
	// Array defining PHP functions exposed as JSONRPC methods by this server
	private $dispatchMap = Array();
	
	/**
	* When set to true, it will enable HTTP compression of the response, in case the client has declared its support
	* for compression in the request.
	*/
	public $compressResponse = false;
	
	/**
	* Controls wether the server is going to echo debugging messages back to the client as comments in response body.
	* Valid values: 0,1,2,3
	*/
	public $debug = 0;
	
	/**
	* List of http compression methods accepted by the server for requests.
	* PHP supports deflate, gzip compressions out of the box if compiled with zlib
	*/
	public $acceptedCompression = Array();
	
	// Shall we serve calls to system.* methods?
	public $allowSystemFunctions = true;
	
	// List of charset encodings natively accepted for requests
	public $acceptedCharsetEncodings = Array();
	
	// Charset encoding to be used for response.
	public $responseCharsetEncoding = "";
	
	// Storage for internal debug info
	public $debugInfo = "";
	
	// Several system method that provide access to information about the method served by this service.
	// Enabled if "allowSystemFunctions" is set to true.
	public static $systemDispatchMap = Array(
		"system.listMethods" => Array(
			"function" => "JSONRPCService::listMethods",
			"signature" => Array(Array("array")),
			"docstring" => "This method lists all the methods that the JSONRPC server knows how to dispatch",
			"signature_docs" => Array(Array("List of method names"))),
		"system.methodHelp" => Array(
			"function" => "JSONRPCService::methodHelp",
			"signature" => Array(Array("string", "string")),
			"docstring" => "Returns help text if defined for the method passed, otherwise returns an empty string",
			"signature_docs" => Array(Array("Method description", "Name of the method to be described"))),
		"system.methodSignature" => Array(
			"function" => "JSONRPCService::methodSignature",
			"signature" => Array(Array("array", "string")),
			"docstring" => "Returns an array of known signatures (an array of arrays) for the method name passed. 
				If no signatures are known, returns a none-array (test for type != array to detect missing signature)",
			"signature_docs" => Array(Array("List of known signatures, each sig being an array of xmlrpc type names", 
				"name of method to be described")))
	);
	
	public static $occuredErrors = "";
	public static $prevErrorHandler = "";
	
	/**
	* @param Array $dispMap The dispatch map with definition of exposed services
	* @param Boolean $serviceNow Set to false to prevent the server from runnung upon construction
	*/
	public function __construct($dispMap = null, $serviceNow = true) {
		// If ZLIB is enabled, let the server by default accept compressed requests, and compress responses sent to
		// clients that support them
		if (function_exists("gzinflate")) {
			$this->acceptedCompression = Array("gzip", "deflate");
			$this->compressResponse = true;
		}
		
		$this->acceptedCharsetEncodings = Array("UTF-8", "ISO-8859-1");
		
		/**
		* The dispatch map is a dispatch array of methods mapped to function names and signatures if a method
		* doesn't appear in the map then an unknown method error is generated
		*/
		if ($dispMap) {
			$this->dispatchMap = $dispMap;
			
			if ($serviceNow) {
				$this->service(null, true);
			}
		}
	}
	
	/**
	* Set debug level of server.
	* @param Integer $in Debug level: Determines info added to JSONRPC responses (as comments)
	* 0 = no debug info,
	* 1 = msgs set from user with debugmsg(),
	* 2 = add complete jsonrpc request (headers and body),
	* 3 = add also all processing warnings happened during method processing
	* (NB: This involves setting a custom error handler, and might interfere with the standard processing of the PHP
	* function exposed as method. In particular, triggering an USER_ERROR level error will not halt script execution 
	* anymore, but just end up logged in the JSONRPC response).
	* Note that info added at level 2 and 3 will be base64 encoded.
	*/
	public function setDebug($in) {
		$this->debug = $in;
	}
	
	/**
	* Return a string with the serialized representation of all debug info
	* @return String A JSON comment
	*/
	public function serializeDebug() {
		$out = "";
		
		if ($this->debugInfo != "") {
			$out .= "/* SERVER DEBUG INFO:\n" . base64_encode($this->debugInfo) ."\n*/\n";
		}
		
		return $out;
	}
	
	/**
	* @access private
	*/
	private function execute($method, $params = Array(), $paramtypes = null) {
		$sysCall = $this->allowSystemFunctions && ereg("^system\.", $method);
		$dmap = $sysCall ? self::$systemDispatchMap : $this->dispatchMap;
		
		if (!isset($dmap[$method]["function"])) {
			// No such method
			return new JSONRPCErrorResponse("UNKNOWN_METHOD");
		}
		
		// Check signature
		if (isset($dmap[$method]["signature"])) {
			list($ok, $errstr) = $this->verifySignature($paramtypes, $dmap[$method]["signature"]);
			
			if (!$ok) {
				// Didn't match.
				return new JSONRPCErrorResponse("INCORRECT_PARAMS", $errstr);
			}
		}

		$func = $dmap[$method]["function"];
		
		// Let the "class::function" syntax be accepted in dispatch maps
		if (is_string($func) && strpos($func, "::")) {
			$func = explode("::", $func);
		}
		
		// Verify that function to be invoked is in fact callable
		if (!is_callable($func)) {
			return new JSONRPCErrorResponse("SERVER_ERROR", "No function matches method");
		}
		
		// If debug level is 3, we should catch all errors generated during
		// processing of user function, and log them as part of response
		if ($this->debug > 2) {
			self::$prevErrorHandler = set_error_handler("JSONRPCService::errorHandler");
		}
		
		// Call a "plain php" function
		if ($sysCall) {
			array_unshift($params, $this);
		}
		
		$r = call_user_func_array($func, $params);
		
		// The return type should be plain php value...
		if (!is_a($r, "JSONRPCResponse")) {
			$r = new JSONRPCResponse($r);
		}
		
		if ($this->debug > 2) {
			// Note: restore the error handler we found before calling the
			// user func, even if it has been changed inside the func itself
			if (self::$prevErrorHandler) {
				set_error_handler(self::$prevErrorHandler);
			} else {
				restore_error_handler();
			}
		}
		
		return $r;
	}
	
	/**
	* Execute the JSONRPC request, printing the response
	* @param string $data The request body. If null, the HTTP POST request will be examined
	* @return JSONRPCResponse The response object
	*/
	public function service($data = null, $print_payload = true) {
		if ($data === null) {
			$data = isset($GLOBALS["HTTP_RAW_POST_DATA"]) ? $GLOBALS["HTTP_RAW_POST_DATA"] : "";
		}
		
		$raw_data = $data;
		
		// Reset internal debug info
		$this->debugInfo = "";
		
		// Echo back what we received, before parsing it
		if ($this->debug > 1) {
			$this->debugmsg("+++RAW DATA+++\n" . $data . "\n+++END+++");
		}
		
		$r = $this->parseRequestHeaders($data, $req_charset, $resp_charset, $resp_encoding);
		
		if (!$r) {
			$r = $this->parseRequest($data, $req_charset);
		}
		
		// Save full body of request into response, for more debugging usages
		$r->raw_data = $raw_data;
		
		if ($this->debug > 2 && self::$occuredErrors) {
			$this->debugmsg("+++PROCESSING ERRORS AND WARNINGS+++\n" . self::$occuredErrors . "+++END+++");
		}

		
		if ($this->debug > 0) {
			$payload = $this->serializeDebug($resp_charset);
		}
		
		
		// Do not create response serialization if it has already happened. Helps building json magic
		if (empty($r->payload)) {
			$r->serialize($resp_charset);
		}
		
		$payload = $payload . $r->payload;
		
		if ($print_payload) {
			// If we get a warning/error that has output some text before here, then we cannot
			// add a new header. We cannot say we are sending JSON, either...
			if (!headers_sent()) {
				header("Content-Type: " . $r->content_type);
				// We do not know if client actually told us an accepted charset,
				// but if he did we have to tell him what we did
				header("Vary: Accept-Charset");
				
				// HTTP compression of output: only
				// If we can do it, and we want to do it, and client asked us to, 
				// and php ini settings do not force it already
				$php_no_self_compress = ini_get("zlib.output_compression") == "" && ini_get("output_handler") != "ob_gzhandler";
				
				if ($this->compressResponse && function_exists("gzencode") && $resp_encoding != "" && $php_no_self_compress) {
					if (strpos($resp_encoding, "gzip") !== false) {
						$payload = gzencode($payload);
						header("Content-Encoding: gzip");
						header("Vary: Accept-Encoding");
					} elseif (strpos($resp_encoding, "deflate") !== false) {
						$payload = gzcompress($payload);
						header("Content-Encoding: deflate");
						header("Vary: Accept-Encoding");
					}
				}

				// Do not ouput content-length header if php is compressing output for us:
				// It will mess up measurements
				if ($php_no_self_compress) {
					header("Content-Length: " . (int)strlen($payload));
				}
			} else {
				error_log("JSONRPCService::service: HTTP headers already sent before response is fully generated. " .
					"Check for php warning or error messages");
			}
		
			echo $payload;
		}
		
		// Return request
		return $r;
	}
	
	/**
	* Add a string to the 'internal debug message' (separate from 'user debug message')
	* @param String $strings
	*/
	public function debugmsg($string) {
		$this->debugInfo .= $string . "\n";
	}
	
	/**
	* Add a method to the dispatch map
	* @param String $methodName The name with which the method will be made available
	* @param String $function The PHP function that will get invoked
	* @param Array $sig The array of valid method signatures
	* @param String $doc Method documentation
	*/
	public function addToMap($methodName, $function, $sig = null, $doc = "") {
		$this->dispatchMap[$methodName] = Array(
			"function"	=> $function,
			"docstring" => $doc
		);
		
		if ($sig) {
			$this->dispatchMap[$methodName]["signature"] = $sig;
		}
	}
	
	/**
	* Verify type and number of parameters received against a list of known signatures
	* @param Array $in Array of type definitions
	* @param Array $sig Array of known signatures to match against
	* @access private
	*/
	private function verifySignature($in, $sig) {
		// Check each possible signature in turn
		$numParams = count($in);
		
		foreach($sig as $cursig) {
			if (count($cursig) == $numParams + 1) {
				$error = false;
				
				for ($n = 0; $n < $numParams; $n++) {
					$pt = $in[$n];
					
					// Param index is $n + 1, as first member of sig is return type
					if ($pt != $cursig[$n + 1] && $cursig[$n + 1] != "undefined") {
						$error = true;
						$pno = $n + 1;
						$wanted = $cursig[$n + 1];
						$got = $pt;
						break;
					}
				}
				
				if (!$error) {
					return Array(true, "");
				}
			}
		}
		
		if (isset($wanted)) {
			return Array(false, "Wanted " . $wanted . ", got ". $got . " at param " . $pno);
		} else {
			return Array(false, "No method signature matches number of parameters");
		}
	}
	
	/**
	* Parse HTTP headers received along with JSONRPC request. If needed, inflate request
	* @return null on success or an JSONRPCResponse
	*/
	private function parseRequestHeaders(&$data, &$req_encoding, &$resp_encoding, &$resp_compression) {
		if ($this->debug > 1) {
			if (function_exists("getallheaders")) {
				$this->debugmsg(""); // Empty line
				
				foreach (getallheaders() as $name => $val) {
					$this->debugmsg("HEADER: $name: $val\n");
				}
			}
		}
		
		if (isset($_SERVER["HTTP_CONTENT_ENCODING"])) {
			$content_encoding = str_replace("x-", "", $_SERVER["HTTP_CONTENT_ENCODING"]);
		} else {
			$content_encoding = "";
		}

		// Check if request body has been compressed and decompress it
		if ($content_encoding != "" && strlen($data)) {
			if ($content_encoding == "deflate" || $content_encoding == "gzip") {
				// If decoding works, use it. else assume data wasnt gzencoded
				if (function_exists("gzinflate") && in_array($content_encoding, $this->acceptedCompression)) {
					if (($content_encoding == "deflate" && $degzdata = @gzuncompress($data)) ||
						($content_encoding == "gzip" && $degzdata = @gzinflate(substr($data, 10)))) {
						$data = $degzdata;
						
						if ($this->debug > 1) {
							$this->debugmsg("\n+++INFLATED REQUEST+++[" . strlen($data) . " chars]+++\n" . $data . "\n+++END+++");
						}
					} else {
						$r =& new JSONRPCErrorResponse("SERVER_DECOMPRESS_FAIL");
						return $r;
					}
				} else {
					$r =& new JSONRPCErrorResponse("SERVER_CANNOT_DECOMPRESS");
					return $r;
				}
			}
		}
		
		// Check if client specified accepted charsets, and if we know how to fulfill the request
		if ($this->responseCharsetEncoding == "auto") {
			$resp_encoding = "";
			
			if (isset($_SERVER["HTTP_ACCEPT_CHARSET"])) {
				// Here we should check if we can match the client-requested encoding
				// with the encodings we know we can generate.
				$client_accepted_charsets = explode(",", strtoupper($_SERVER["HTTP_ACCEPT_CHARSET"]));
				
				// Give preference to internal encoding
				$known_charsets = Array($this->internal_encoding, "UTF-8", "ISO-8859-1");
				
				foreach ($known_charsets as $charset) {
					foreach ($client_accepted_charsets as $accepted) {
						if (strpos($accepted, $charset) === 0) {
							$resp_encoding = $charset;
							break;
						}
						
						if ($resp_encoding) {
							break;
						}
					}
				}
			}
		} else {
			$resp_encoding = $this->responseCharsetEncoding;
		}

		if (isset($_SERVER["HTTP_ACCEPT_ENCODING"])) {
			$resp_compression = $_SERVER["HTTP_ACCEPT_ENCODING"];
		} else {
			$resp_compression = "";
		}
		
		// 'Guestimate' request encoding
		$req_encoding = guess_encoding(isset($_SERVER["CONTENT_TYPE"]) ? $_SERVER["CONTENT_TYPE"] : "", $data);
		
		return null;
	}
	
	private function parseRequest($data, $content_encoding = "") {
		$json = new Services_JSON(SERVICES_JSON_LOOSE_TYPE);
		$data = $json->decode($data);
		
		if (!$data || !$data["method"]) {
			return new JSONRPCErrorResponse("INVALID_REQUEST", "JSON parsing did not return correct jsonrpc request object");
		} else {
			$method = $data["method"];
			
			if (is_array($data["params"])) {
				$params = $data["params"];
				$paramsType = Array();
				
				foreach ($params as $key => $value) {
					if (is_int($value)) {
						$paramsType[] = "int";
					} else if (is_bool($value)) {
						$paramsType[] = "boolean";
					} else if (is_double($value)) {
						$paramsType[] = "double";
					} else if (is_string($value)) {
						$paramsType[] = "string";
					} else if (is_array($value)) {
						$paramsType[] = "array";
					} else {
						$paramsType[] = "value";
					}
				}
			} else {
				$params = Array();
				$paramsType = Array();
			}
			
			if ($this->debug > 1) {
				$this->debugmsg("\n+++PARSED+++\n" . var_export($params, true) . "\n+++END+++");
			}
			
			return $this->execute($method, $params, $paramsType);
		}
	}
	
	/**
	* Error handler used to track errors that occur during server-side execution of PHP code.
	* This allows to report back to the client whether an internal error has occurred or not
	* using an JSONRPCResponse object, instead of letting the client deal with the HTML junk
	* that a PHP execution error on the server generally entails.
	*
	* NB: in fact a user defined error handler can only handle WARNING, NOTICE and USER_* errors.
	*/
	public static function errorHandler($errcode, $errstring, $filename = null, $lineno = null, $context = null) {
		// Obey the @ protocol
		if (error_reporting() == 0) {
			return;
		}
		
		if ($errcode != 2048) { // Do not use E_STRICT by name, since on PHP 4 it will not be defined
			self::$occuredErrors .= $errstring . "\n";
		}
		
		// Try to avoid as much as possible disruption to the previous error handling mechanism in place
		if (self::$prevErrorHandler == "") {
			// The previous error handler was the default: all we should do is log error
			// to the default error log (if level high enough)
			if (ini_get("log_errors") && (intval(ini_get("error_reporting")) & $errcode)) {
				error_log($errstring);
			}
		} else {
			// Pass control on to previous error handler, trying to avoid loops...
			if (self::$prevErrorHandler != "jsonrpcErrorHandler") {
				// NB: this code will NOT work on php < 4.0.2: only 2 params were used for error handlers
				if (is_array(self::$prevErrorHandler)) {
					self::$prevErrorHandler[0]->jsonrpcErrorHandler[1]($errcode, $errstring, $filename, $lineno, $context);
				} else {
					self::$prevErrorHandler($errcode, $errstring, $filename, $lineno, $context);
				}
			}
		}
	}
	
	/**
	* This method lists all the methods that the JSONRPC server knows how to dispatch.
	*/
	public static function listMethods($service) {
		$outAr = Array();
		
		foreach ($service->dispatchMap as $key => $val) {
			$outAr[] = $key;
		}
		
		if ($server->allowSystemFunctions) {
			foreach (self::$systemDispatchMap as $key => $val) {
				$outAr[] = $key;
			}
		}
		
		return $outAr;
	}
	
	/**
	* Returns help text if defined for the method passed, otherwise returns an empty string.
	*/
	public static function methodHelp($service, $method = "") {
		if (strpos($method, "system.") === 0) {
			$dmap = self::$systemDispatchMap;
			$sysCall = 1;
		} else {
			$dmap = $service->dispatchMap;
			$sysCall = 0;
		}
		
		if (isset($dmap[$method])) {
			if (isset($dmap[$method]["docstring"])) {
				return $dmap[$method]["docstring"] . "lööööösli";
			} else {
				return "";
			}
		}
		
		return new JSONRPCErrorResponse("INTROSPECT_UNKNOWN");
	}
	
	/**
	* Returns an array of known signatures (an array of arrays) for the method name passed. 
	* If no signatures are known, returns a none-array (test for type != array to detect missing signature).
	*/
	public static function methodSignature($service, $method) {
		if (strpos($method, "system.") === 0) {
			$dmap = self::$systemDispatchMap;
			$sysCall = 1;
		} else {
			$dmap = $service->dispatchMap;
			$sysCall = 0;
		}
		
		if (isset($dmap[$method])) {
			if (isset($dmap[$method]["signature"])) {
				$sigs = Array();
				
				foreach ($dmap[$method]["signature"] as $inSig) {
					$cursig = Array();
					
					foreach($inSig as $sig) {
						$cursig[]= $sig;
					}
					
					$sigs[] = $cursig;
				}
				
				return $sigs;
			} else {
				return null;
			}
		}
		
		return new JSONRPCErrorResponse("INTROSPECT_UNKNOWN");
	}
}

class JSONRPCErrorCodes {
	private static $codes = Array(
		"UNKNOWN_METHOD" => 1,
		"INVALID_RETURN" => 2,
		"INCORRECT_PARAMS" => 3,
		"INTROSPECT_UNKNOWN" => 4,
		"HTTP_ERROR" => 5,
		"NO_DATA" => 6,
		"NO_SSL" => 7,
		"CURL_FAIL" => 8,
		"INVALID_REQUEST" => 15,
		"NO_CURL" => 16,
		"SERVER_ERROR" => 17,
		"CANNOT_DECOMPRESS" => 103,
		"DECOMPRESS_FAIL" => 104,
		"DECHUNK_FAIL" => 105,
		"SERVER_CANNOT_DECOMPRESS" => 106,
		"SERVER_DECOMPRESS_FAIL" => 107,
		"UNKNOWN_ERROR" => 999
	);
	
	private static $strings = Array(
		"UNKNOWN_METHOD" => "Unknown method",
		"INVALID_RETURN" => "Invalid return payload: enable debugging to examine incoming payload",
		"INCORRECT_PARAMS" => "Incorrect parameters passed to method",
		"INTROSPECT_UNKNOWN" => "Can't introspect: method unknown",
		"HTTP_ERROR" => "Didn't receive 200 OK from remote server.",
		"NO_DATA" => "No data received from server",
		"NO_SSL" => "No SSL support compiled in",
		"CURL_FAIL" => "CURL error",
		"INVALID_REQUEST" => "Invalid request payload",
		"NO_CURL" => "No CURL support compiled in",
		"SERVER_ERROR" => "Internal server error",
		"CANNOT_DECOMPRESS" => "Received from server compressed HTTP and cannot decompress",
		"DECOMPRESS_FAIL" => "Received from server invalid compressed HTTP",
		"DECHUNK_FAIL" => "Received from server invalid chunked HTTP",
		"SERVER_CANNOT_DECOMPRESS" => "Received from client compressed HTTP request and cannot decompress",
		"SERVER_DECOMPRESS_FAIL" => "Received from client invalid compressed HTTP request",
		"UNKNOWN_ERROR" => "Unknown error"
	);
	
	public static function add($name, $code, $string) {
		self::$codes[$name] = $code;
		self::$strings[$name] = $string;
	}
	
	public static function get($name) {
		$code = self::$codes[$name];
		$string = self::$strings[$name];
		
		if ($code && $string) {
			return Array($code, $string);
		} else {
			return JSONRPCErrorCodes::get("UNKNOWN_ERROR");
		}
	}
}

/**
* JSON charset encoding guessing helper function.
* Tries to determine the charset encoding of an JSON chunk received over HTTP.
* @param String $httpheaders The HTTP Content-type header
* @param String $jsonchunk JSON content buffer
* @param String $encoding_prefs Comma separated list of character encodings to be used as default (when mb extension is enabled)
*/
function guess_encoding($httpheader = "", $jsonchunk = "", $encoding_prefs = null) {
	// Discussion: see http://www.yale.edu/pclt/encoding/
	// 1 - test if encoding is specified in HTTP HEADERS
	// Details:
	// LWS:           (\13\10)?( |\t)+
	// token:         (any char but excluded stuff)+
	// header:        Content-type = ...; charset=value(; ...)*
	//   where value is of type token, no LWS allowed between 'charset' and value
	// Note: we do not check for invalid chars in VALUE: this had better be done using pure ereg as below
	$matches = Array();
	
	if (preg_match('/;\s*charset=([^;]+)/i', $httpheader, $matches)) {
		return strtoupper(trim($matches[1]));
	}

	// 2 - scan the first bytes of the data for a UTF-16 (or other) BOM pattern
	//     (source: http://www.w3.org/TR/2000/REC-xml-20001006)
	//     NOTE: actually, according to the spec, even if we find the BOM and determine
	//     an encoding, we should check if there is an encoding specified
	//     in the xml declaration, and verify if they match.
	if (preg_match('/^(\x00\x00\xFE\xFF|\xFF\xFE\x00\x00|\x00\x00\xFF\xFE|\xFE\xFF\x00\x00)/', $jsonchunk)) {
		return 'UCS-4';
	} elseif(preg_match('/^(\xFE\xFF|\xFF\xFE)/', $jsonchunk)) {
		return 'UTF-16';
	} elseif(preg_match('/^(\xEF\xBB\xBF)/', $jsonchunk)) {
		return 'UTF-8';
	}
	
	// 3 - if mbstring is available, let it do the guesswork
	// NB: we favour finding an encoding that is compatible with what we can process
	if (extension_loaded("mbstring")) {
		if ($encoding_prefs) {
			$enc = mb_detect_encoding($jsonchunk, $encoding_prefs);
		} else {
			$enc = mb_detect_encoding($jsonchunk);
		}
		
		// NB: mb_detect likes to call it ascii, xml parser likes to call it US_ASCII...
		// IANA also likes better US-ASCII, so go with it
		if ($enc == "ASCII") {
			$enc = "US-" . $enc;
		}
		
		return $enc;
	} else {
		return "UTF-8";
	}
}

?>