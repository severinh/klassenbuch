<?php

/*
 * Klassenbuch
 * JSONRPCResponse: Based on XML-RPC for PHP (http://phpxmlrpc.sourceforge.net/)
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

class JSONRPCResponse {
	public $val = 0;
	public $errno = 0;
	public $errstr = "";
	public $payload = "";
	public $content_type = "application/json";
	public $raw_data = "";
	
	/**
	* @param Mixed $val A PHP value or the JSON serialization of a PHP value (a string)
	* @param Integer $fcode Set it to anything but 0 to create an error response
	* @param String $fstr The error string, in case of an error response
	* @param String $valtyp Either 'phpvals' or 'json'
	*/
	public function __construct($val = 0, $fcode = 0, $fstr = "") {
		$this->val = $val;
		$this->errno = $fcode;
		$this->errstr = $fstr;
	}

	/**
	* Returns the error code of the response.
	* @return Integer The error code of this response (0 for not-error responses)
	* @access public
	*/
	public function faultCode() {
		return $this->errno;
	}
	
	/**
	* Returns the error code of the response.
	* @return String The error string of this response ('' for not-error responses)
	* @access public
	*/
	public function faultString() {
		return $this->errstr;
	}

	/**
	* Returns the value received by the server.
	* @return Might be an json string or php value
	* @access public
	*/
	public function value() {
		return $this->val;
	}
	
	/**
	* Returns json representation of the response.
	* @param String $charset_encoding The charset to be used for serialization. if null, US-ASCII is assumed
	* @return String The json representation of the response
	* @access public
	*/
	public function serialize($charset_encoding = "") {
		if ($charset_encoding != "") {
			$this->content_type = "application/json; charset=" . $charset_encoding;
		} else {
			$this->content_type = "application/json";
		}
		
		$this->payload = "{";
		
		$json = new Services_JSON(SERVICES_JSON_LOOSE_TYPE);
		
		if ($this->errno) {
			// Let non-ASCII response messages be tolerated by clients by encoding non ascii chars
			$this->payload .= "\"error\":{\"faultCode\":" . $this->errno . ",\"faultString\":\"" . $this->errstr . "\"}";
		} else {
			$this->payload .= "\"result\":" . $json->encode($this->val);
		}
		
		$this->payload .= "}";
		
		return $this->payload;
	}
}



class JSONRPCErrorResponse extends JSONRPCResponse {
	public function __construct($errorName, $append = "") {	
		list($code, $string) = JSONRPCErrorCodes::get($errorName);
		
		if ($append) {
			$append = ": " . $append;
		}
		
		$this->val = 0;
		$this->errno = $code;
		$this->errstr = $string . $append;
	}
}

?>