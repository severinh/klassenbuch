/*
 * Klassenbuch
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

/**
 * @fileOverview Auxiliry file that provides a series of basic classes and functions used all over the Klassenbuch's
 * code. They consist of direct additions to Prototype's functionality such as methods that are applied to all DOM
 * nodes passed to <em>Element.extend</em>, of JSON-specific server communication classes and an object that provides
 * additional information about the user's browser etc.
 * @author <a href="mailto:severinheiniger@gmail.com">Severin Heiniger</a>
*/

/**
 * <em>Object</em> is used as a namespace for several basic functions in the same way the Prototype framework does.
 * The functions added by Prototype are described here:
 * <a href="http://www.prototypejs.org/api/object">Prototype's API documentation</a>.
 * @namespace
*/
Object.extend(Object, /** @scope Object */ {
	/**
	 * Returns <em>true</em> if the passed variable is of type <em>null</em>, <em>false</em> otherwise.
	 * @param {Object} object The variable to be checked.
	 * @returns {Boolean} Whether the variable is <em>null</em> or not.
	*/
	isNull: function(object) {
		return object === null;
	},
	
	/**
	 * Returns <em>true</em> if the passed variable is defined, <em>false</em> otherwise.
	 * @param {Object} object The variable to be checked.
	 * @returns {Boolean} Whether the variable is defined or not.
	*/
	isDefined: function(object) {
		return typeof object !== "undefined";
	},
	
	/**
	 * Clones the passed object using deep copy (copies off all the original's properties and even nested properties
	 * to the result). Unlike Prototype's <a href="http://www.prototypejs.org/api/object/clone">Object.clone</a> this
	 * recursive function produces a deep copy rather than a shallow copy.
	 * @param {Object} object The object to clone.
	 * @returns {Object} The object's deep copy.
	*/
	cloneDeeply: function(source) {
		var result = {};
		
		for (property in source) {
			if (typeof source[property] === "object") { // Property is an object itself
				result[property] = arguments.callee(source[property]);
			} else {
				result[property] = source[property];
			}
		}
		
		return result;
	}
});

/**
 * Some extensions to Prototype's browser detection functionality (<em>Prototype.Browser</em>). It checks whether the browser supports
 * cookies or is supported in general.
 * @namespace
*/
Object.extend(Prototype.Browser, (function() {
	var version;
	
	// Some shortcuts
	var B = Prototype.Browser;
	var ua = navigator.userAgent.toLowerCase();
	
	var isFirefox = B.Gecko && ua.include("firefox");
	
	// Browser version detection (only applies to IE, Opera and Firefox)
	if (B.IE) {
		version = (!Object.isNull(/msie ([0-9]{1,}[\.0-9]{0,})/.exec(ua))) ? parseFloat(RegExp.$1) : 3;
	} else if (B.Opera) {
		version = (window.opera.version) ? parseFloat(window.opera.version()) : 7.5;
	} else if (isFirefox) {
		version = parseFloat(ua.substr(ua.indexOf("firefox") + 8, 3));
	}
	
	return /** @scope Prototype.Browser */ {
		/**
		 * Indicates whether the browser supports setting, getting and removing cookies using JavaScript. This is achieved by setting a
		 * temporary cookie.
		 * @type Boolean
		*/
		supportsCookies: (function() {
			if (Object.isDefined(navigator.cookieEnabled)) {
				return navigator.cookieEnabled;
			} else if (Cookie.set("testcookie", "testvalue") === "testvalue") {
				Cookie.remove("testcookie");
				return true;
			}
			
			return false;
		})(),
		
		/**
		 * Indicates whether Firefox is used to access the application.
		 * @type Boolean
		*/
		Firefox: isFirefox,
		
		/**
		 * Indicates whether good ol' Internet Explorer 6 is used to access the application. Perish the thought this property might ever
		 * be <em>true</em>.
		 * @type Boolean
		*/
		IE6: (B.IE && version === 6),
		
		/**
		 * Provides the browser version, in case the quite basic version detection did it's job properly.
		 * @type Boolean
		*/
		version: version,
		
		/**
		 * Indicates whether the used browser should be able to run the application smoothly. Currently 
		 * @todo Should be moved to a more reasonable place.
		 * @type Boolean
		*/
		supported: !((isFirefox && version < 1.5) || (B.IE && version < 6))
	};
})());

/**
 * Provides several classes that are connected with JSONRPC-specific server communication in order to enable simple JSONRPC requests and 
 * file uploads using JSONRPC.
 * @namespace
*/
var JSONRPC = {
	/**
	 * The relative path to the JSONRPC service.
	 * @type String
	*/
	"SERVICE_FILE": "service.php",
	
	/**
	 * A map of both client and server side JSONRPC error codes.
	 * @type Object
	*/
	"ERROR_CODE": {
		"UNKNOWN_METHOD": 1,
		"INVALID_RETURN": 2,
		"INCORRECT_PARAMS": 3,
		"INTROSPECT_UNKNOWN": 4,
		"HTTP_ERROR": 5,
		"NO_DATA": 6,
		"NO_SSL": 7,
		"CURL_FAIL": 8,
		"INVALID_REQUEST": 15,
		"NO_CURL": 16,
		"SERVER_ERROR": 17,
		"CANNOT_DECOMPRESS": 103,
		"DECOMPRESS_FAIL": 104,
		"DECHUNK_FAIL": 105,
		"SERVER_CANNOT_DECOMPRESS": 106,
		"SERVER_DECOMPRESS_FAIL": 107,
		"AUTHENTICATION_FAILED": 800,
		"INVALID_DATABASE_QUERY": 801,
		"INVALID_RESPONSE": 850,
		"UNKNOWN_ERROR": 999
	}
};

/**
 * @class Initiates and processes JSONRPC requests.  and handles response parsing and validation.
 * @extends Ajax.Request
 * @param {String} method Name of the method to be called on the server. E. g. <em>gettasks</em> to get a list of upcoming tasks.
 * @param {Array} params Optional parameter that are passed to the service function. Default value is <em>[]</em>.
 * @param {Object} options May contain various callback function such as <em>onSuccess</em>, <em>onFailure</em>
 * and <em>onComplete</em>, which are called in case the request is successful respectively if it has failed.
 * @example
new JSONRPC.Request("foobar", [], {
	onSuccess: function(response) {
		alert("Webservice method "foobar" said: " + response.result);
	},
	
	onFailure: function(response) {
		alert("Bad luck. Something went wrong.\nError message:" + response.faultString);
	}
});
*/
JSONRPC.Request = Class.create(Ajax.Request, /** @scope JSONRPC.Request.prototype */ {
	initialize: function($super, method, params, options) {
		// Default callback functions. 
		options = Object.extend({
			onSuccess: Prototype.K,
			onComplete: Prototype.K,
			
			// If <em>onFailure</em> isn't overriden using the <em>options</em> argument, a simple standard error
			// message shows up if the request fails.
			onFailure: function(response) {
				response.standardErrorAlert();
			},
			
			// Generally, this options shouldn't be overridden.
			serviceFile: JSONRPC.SERVICE_FILE
		}, options || {});
		
		// Prepare request body.
		var requestParams = $H({
			method: method,
			params: params || []
		});
		
		// If the browser doesn't support cookies we have to transmit the user id and the user token along with the method name and the
		// parameters in case the user is signed in.
		if (User.signedIn && !Prototype.Browser.supportsCookies) {
			requestParams.set("userid", User.id);
			requestParams.set("token", User.token);
		}
		
		// Calling Ajax.Request's constructor.
		$super(options.serviceFile, {
			// In case an unexpected client side error occures.
			onException: (function(e) {
				options.onFailure(new JSONRPC.Response(null, 999, e.message || "Unbekannter Fehler"));
			}).bind(this),
			
			// Processes the server response.
			onComplete: (function(response) {
				if (this.success()) { // We did the job without triggering a HTTP error up to now.
					response = JSONRPC.Response.fromAjaxResponse(response);
					
					// Calls the appropriate callback function.
					options["on" + ((response.success() ? "Success" : "Failure"))](response);
				} else { // Bad luck. We ran into a HTTP error.
					response = new JSONRPC.Response(null, this.transport.status, "HTTP-Fehler " + this.transport.status);
					
					options.onFailure(response);
				}
				
				options.onComplete(response);
			}).bind(this),
			
			contentType: "application/javascript",
			
			// The request body actually sent to the server.
			postBody: requestParams.toJSON(),
			
			// Force base class to parse the response, even if the response's content type header isn't correctly set.
			evalJSON: false
		});
	}
});

/**
 * Represents an answer to a JSONRPC request initiated with <a href="JSONRPC.Request.htm">
 * JSONRPC.Request</a> or <a href="JSONRPC.Upload.htm">JSONRPC.Upload</a>.
 * @param {Object} result The parsed server response.
 * @param {Integer} [faultCode] Optional fault code, in case the request has failed for some reason.
 * @param {String} [faultString] Optional fault string, in case the request has failed for some reason.
 * @class
*/
JSONRPC.Response = Class.create( /** @scope JSONRPC.Response.prototype */ {
    initialize: function(result, faultCode, faultString) {
		/**
		 * The parsed server response. Can be of any conceivable type, even of a literal or an array.
		 * @type Object
		*/
        this.result = result;
		
		/**
		 * The error code received by the server or added while processing the response. Must me 0 if the request was successful.
		 * Defaults to 0.
		 * @type Number
		*/
        this.faultCode = faultCode || 0;
		
		/**
		 * The error message received by the server or added while processing the response. Defaults to "".
		 * @type String
		*/
        this.faultString = faultString || "";
    },
    
	/**
	 * Shows a default error message, based on the error code and error string, included in the service response, in case the JSONRPC
	 * was failed.
	*/
    standardErrorAlert: function() {
		if (!this.success()) { // Message shouldn't show up if the request was successful.
			alert("Es ist ein Problem bei der Kommunikation mit dem Server aufgetreten. Lade das Klassenbuch neu und " +
				"versuche es erneut. Wende dich an die Klassenbuchverwaltung, falls das Problem bestehen bleibt.\n\n" +
				"Fehlermeldung: " + this.faultString + "\nFehlercode: " + this.faultCode);
		}
    },
	
	/**
	 * Indicates whether the JSONRPC request was successful or not.
	 * @returns Boolean 
	*/
	success: function() {
		return !this.faultCode;
	}
});

/**
 * Transforms any response string, already parsed string or object of type Ajax.Response into a JSONRPC Response and handles correctly
 * malformed JSONRPC responses.
 * @param {String|Object|Ajax.Response} response The response received from the server.
 * @returns JSONRPC.Response The resulting JSONRPC.Response object.
 * @static
*/
JSONRPC.Response.fromAjaxResponse = function(response) {
	var result = null, faultCode = 0, faultString = "";
	
	// Handle Ajax.Response object.
	response = response.responseText || response;
	
	// Mark response as invalid.
	var invalidResponse = function() {
		faultCode = 850;
		faultString = "Einlesen der Server-Antwort fehlgeschlagen";
	};
	
	if (Object.isString(response)) { // Need to parse response string first.
		try {
			response = response.evalJSON(true);
		} catch(e) { // Malformed JSON string.
			invalidResponse();
		}
	}
	
	// Check if parsed JSON response follows the JSONRPC specifications.
	if (response && Object.isDefined(response.result) && Object.isDefined(response.error)) { 
		if (Object.isNull(response.error)) {
			result = response.result;
		} else { // There was an error processing the JSONRPC request.
			faultCode = response.error.faultCode;
			faultString = response.error.faultString;
		}
	} else {
		invalidResponse();
	}
	
	// Generate JSONRPC.Response object.
	return new JSONRPC.Response(result, faultCode, faultString);
};

JSONRPC.Upload = Class.create(SWFUpload, {
	initialize: function($super, method, params, options) {
		this.method = method;
		
		options = Object.extend({
			service_file: 					JSONRPC.SERVICE_FILE,
			begin_upload_on_queue: 			false,
			
			file_size_limit: 				10240,
			file_types: 					"*.*",
			file_types_description: 		"Alle Dateien"
		}, options || {});
		
		var uploadComplete = function(file, data) {
			this.fireEvent("uploadComplete", file, data);
			
			var response = JSONRPC.Response.fromAjaxResponse(data);
			
			this.fireEvent((response.success()) ? "uploadSuccess" : "uploadFailure", file, response);
			
			if (options.begin_upload_on_queue) {
				this.startUpload();
			}
		};
		
		var fileQueueError = function(errorCode, file, message) {
			switch(errorCode) {
				case JSONRPC.Upload.QUEUE_ERROR.FILE_EXCEEDS_SIZE_LIMIT:
					message = "Datei ist zu gross";
					break;
				case JSONRPC.Upload.QUEUE_ERROR.ZERO_BYTE_FILE:
					message = "0-Byte-Datei";
					break;
				case JSONRPC.Upload.QUEUE_ERROR.QUEUE_LIMIT_EXCEEDED:
					message = "Hochlade-Limit erreicht";
					break;
				case JSONRPC.Upload.QUEUE_ERROR.INVALID_FILETYPE:
					message = "Dateityp ist nicht erlaubt";
					break;
				default:
					message = "Unbekannter Fehler: " + errorCode;
					break;
			}
			
			this.fireEvent("fileQueueError", file, new JSONRPC.Response(null, errorCode, message));
		};
		
		var uploadError = function(errorCode, file, message) {
			switch(errorCode) {
				case JSONRPC.Upload.UPLOAD_ERROR.SPECIFIED_FILE_ID_NOT_FOUND:
					message = "Angegebene Datei-ID für den Upload wurde nicht gefunden";
					break;
				case JSONRPC.Upload.UPLOAD_ERROR.HTTP_ERROR:
					message = "HTTP-Fehler: " + errorCode;
					break;
				case JSONRPC.Upload.UPLOAD_ERROR.MISSING_UPLOAD_URI:
					message = "Backend-Datei wurde nicht gefunden";
					break;
				case JSONRPC.Upload.UPLOAD_ERROR.IO_ERROR:
					message = "EA-Fehler: " + message;
					break;
				case JSONRPC.Upload.UPLOAD_ERROR.SECURITY_ERROR:
					message = "Sicherheitsverletzung: " + message;
					break;
				case JSONRPC.Upload.UPLOAD_ERROR.QUEUE_LIMIT_EXCEEDED:
					message = "Hochlade-Limit erreicht";
					break;
				case JSONRPC.Upload.UPLOAD_ERROR.UPLOAD_FAILED:
					message = "Fehler bei der Initialisierung des Uploads: " + message;
					break;
				case JSONRPC.Upload.UPLOAD_ERROR.FILE_VALIDATION_FAILED:
					message = "Dateivalidierung fehlgeschlagen";
					break;
				case JSONRPC.Upload.UPLOAD_ERROR.FILE_CANCELLED:
					message = "Hochladevorgang wurde abgebrochen";
					break;
				case JSONRPC.Upload.UPLOAD_ERROR.UPLOAD_STOPPED:
					message = "Hochladevorgang wurde angehalten";
					break;
				default:
					message = "Unbekannter Fehler: " + errorCode;
					break;
			}
			
			this.fireEvent("uploadError", file, new JSONRPC.Response(null, errorCode, message));
		};
		
		$super(Object.extend(options, {
			// Backend-Einstellungen
			upload_url: 					"../" + options.service_file,
			
			// Flash-Einstellungen
			flash_url: 					    "flash/swfupload.swf",
			
			// Event-Handler
			swfupload_loaded_handler:       this.fireEvent.bind(this, "ready"),
			file_dialog_start_handler:		this.fireEvent.bind(this, "fileDialogStart"),
            file_queued_handler:            this.fireEvent.bind(this, "fileQueued"),
            file_dialog_complete_handler:	this.fireEvent.bind(this, "fileDialogComplete"),
            
            upload_start_handler:			this.fireEvent.bind(this, "uploadStart"),
            upload_progress_handler:		this.fireEvent.bind(this, "uploadProgress"),
			
            file_queue_error_handler:       fileQueueError.bind(this),
            upload_complete_handler:		uploadComplete.bind(this),
            upload_error_handler:			uploadError.bind(this)
		}));
		
		this.on("ready", this.setJSONParams.bind(this, params || []));
		
		this.on("uploadComplete", function() {
			if (this.getStats().files_queued == 0) {
				this.fireEvent("queueComplete");
			}
		}, this);
		
		if (options.begin_upload_on_queue) {
			this.on("fileDialogComplete", function() {
				this.startUpload.bind(this).defer();
			}, this);
		}
	},
	
	browse: function() {
		if (this.getSetting("file_upload_limit") == 1) {
			this.selectFile();
		} else {
			this.selectFiles();
		}
	},
	
	setJSONParams: function(params) {
		this.setPostParams({
			userid: User.id,
			token: User.token,
			jsonrpc: $H({ method: this.method, params: params }).toJSON()
		});
	}
});

JSONRPC.Upload.UPLOAD_ERROR = SWFUpload.UPLOAD_ERROR;
JSONRPC.Upload.QUEUE_ERROR = SWFUpload.QUEUE_ERROR;

Object.extend(Number.prototype, function() {
	var scales = $w("Byte KB MB GB TB");
	
	return {
		limitTo: function(a, b) {
			return (this < a) ? a : ((this > b) ? b : this);
		},
		
		getFormatedDataSize: function() {
			var temp = this;
			var currentScale = 0;
			
			while (temp >= 1024) {
				temp = temp / 1024;
				++currentScale;
			}
			
			return temp.roundTo(2) + " " + scales[currentScale] + ((currentScale === 0 && (temp == 0 || temp > 1)) ? "s" : "");
		},
		
		roundTo: function(a) {
			return (this * Math.pow(10, a)).round() / Math.pow(10, a);
		}
	};
}());

/**
 * Einige ergänzende Methoden zur nativen String-Klasse. Diese hinzugefügten Methoden können wie die nativen Methoden
 * aufgerufen werden.
 * @example <pre class="code">
var abc = "hallo welt";
alert(abc.capitalize()); // -> Gibt "Hallo Welt" aus
</pre>
 * Auch Prototype fügt <em>String</em> verschiedene neue Methoden hinzu. Diese Methoden werden in der
 * <a href="http://www.prototypejs.org/api/object">API-Dokumentation von Prototype</a> ausführlich beschrieben.
*/
Object.extend(String.prototype, /** @scope String.prototype */ {
	/**
	 * Gibt zurück, wie oft eine bestimmte Zeichenfolge vorkommt.
	 * @returns {Integer} Die Anzahl der Fundstellen.
	*/
	count: function(a) {
		if (a === "") {
			return 0;
		}
		
		return this.split(a).length - 1;
	},
	
	/**
	 * Lässt alle Wörter in der Zeichenfolge mit einem Grossbuchstaben beginnen.
	 * @param {String} [value] Das Zeichen, das als Zwischenraum zwischen zwei Wörtern dient. Standardwert ist
	 * <em>" "</em>.
	 * @returns {String} Die resultierende Zeichenfolge.
	*/
	capitalize: function(value) {
		return this.split(value || " ").collect(function(a) {
			return a.charAt(0).toUpperCase() + a.substring(1);
		}).join(value || " ");
	},
	
	replaceAll: function(a, b) {
        return this.split(a).join(b);
	},
	
	lowerFirstLetter: function() {
		return (this.length >= 2) ? this.charAt(0).toLowerCase() + this.substring(1) : this.toLowerCase();
	},
	
	/**
	 * Prüft, ob es sich bei der Zeichenfolge um eine gültige E-Mail-Adresse handelt.
	 * @returns Ob es eine gültige E-Mail-Adresse ist.
	*/
	isValidMailAddress: function() {
		var regExp = /^[a-zA-Z0-9]+[_a-zA-Z0-9-]*(\.[_a-z0-9-]+)*@[a-z??????0-9]+(-[a-z??????0-9]+)*(\.[a-z??????0-9-]+)*(\.[a-z]{2,4})$/;
		return regExp.test(this);
	},
	
	addressify: function() {
		var store = arguments.callee._STORE[this];
		
		if (Object.isDefined(store)) {
			return store;
		}
		
		return arguments.callee._STORE[this] = this.toLowerCase()
			.replace(/([\s])/g, "-")
			.replaceAll("ü", "ue")
			.replaceAll("ä", "ae")
			.replaceAll("ö", "oe")
			.replace(/[^A-Z^a-z^0-9-]/g, "");
	},
	
	toDate: function() {
		return $D(this);
	},
	
	strip: function() {
		str = this.replace(/^\s+/, "");
		
		for (var i = str.length - 1; i > 0; i--) {
			if (/\S/.test(str.charAt(i))) {
				str = str.substring(0, i + 1); break;
			}
		}
		
		return str;
	}
});

String.prototype.addressify._STORE = {};

String.Builder = function() {
	var addOne = Prototype.Browser.IE ? 
		function(str) {
			this._strings.push(str);
		} :
		
		function(str) {
			this._strings += str;
		};
		
	var get = Prototype.Browser.IE ?
		function() {
			return this._strings.join("");
		} :
		
		function() {
			return this._strings;
		};
	
	return Class.create({
		initialize: function() {
			this._strings = (Prototype.Browser.IE) ? [] : "";
			this.add.apply(this, arguments);
		},
		
		add: function() {
			$A(arguments).each(this.addOne, this);
		},
		
		addOne: addOne,
		get: get
	});
}();

// Stammt in Teilen aus der Entwicklermailingliste von Prototype.
(function() {
	var multipliers = $H({
		year: 365.25 * 24 * 60 * 60 * 1000,
		month: 30 * 24 * 60 * 60 * 1000,
		week: 7 * 24 * 60 * 60 * 1000,
		day: 24 * 60 * 60 * 1000,
		hour: 60 * 60 * 1000,
		minute: 60 * 1000,
		second: 1000,
		millisecond: 1
	});
	
	var plurals = new Hash();
	
	multipliers.each(function(pair) {
		plurals.set(pair.key + "s", pair.value);
	});
	
	multipliers.update(plurals);
	
	var compare = function(add) {
		return this.removeTime(true).getTime() === new Date().removeTime().add(add).getTime();
	};
	
	Object.extend(Date.prototype, {
		succ: function() {
			return new Date(this.getTime() + (24 * 60 * 60 * 1000));
		},
		
		add: function(number, unit) {
			this.setTime(this.getTime() + (number * multipliers.get(unit || "day")));
			return this;
		},
		
		diff: function(dateObj, unit, allowDecimal) {
			dateObj = $D(dateObj);
			
			if (Object.isNull(dateObj)) {
				return null;
			}
			
			var ms = this.getTime() - dateObj.getTime();
			var unitDiff = ms / multipliers.get(unit || "day");
			return (allowDecimal ? unitDiff : Math.floor(unitDiff));
		},
		
		toJSON: function() {
			return this.format("\"Y-m-dTH:i:s\"");
		},
		
		// Inspiriert von http://www.codeproject.com/jscript/dateformat.asp
		format: function(f) {
			var self = this;
			
			var hours = this.getHours();
			var a = (hours < 12) ? "am" : "pm";
			var g = (hours >= 12) ? hours - 12 : hours;
			var G = hours;
			var j = this.getDate();
			var n = this.getMonth() + 1;
			
			return f.replace(/(a|A|d|D|F|g|G|h|H|i|j|m|n|M|s|Y)/gi, function($1) {
				switch ($1) {
					case "a": return a; break;
					case "A": return a.toUpperCase(); break;
					case "d": return j.toPaddedString(2); break;
					case "D": return Date.weekdaysAbbr[self.getDay()]; break;
					case "F": return Date.months[self.getMonth()]; break;
					case "g": return g; break;
					case "G": return G; break;
					case "h": return g.toPaddedString(2); break;
					case "H": return G.toPaddedString(2); break;
					case "i": return self.getMinutes().toPaddedString(2); break;
					case "j": return j; break;
					case "m": return n.toPaddedString(2); break;
					case "n": return n; break;
					case "M": return Date.months[self.getMonth()].substr(0, 3); break;
					case "s": return self.getSeconds().toPaddedString(2); break;
					case "Y": return self.getFullYear();
				}
			});
		},
		
		getTimestamp: function() {
			return Math.round(this.getTime() / 1000);
		},
		
		setTimestamp: function(timestamp) {
			this.setTime(timestamp * 1000);
			
			return this;
		},
		
		equals: function(date) {
			return this.getTimestamp() === date.getTimestamp();
		},
		
		isToday: compare.curry(0),
		wasYesterday: compare.curry(-1),
		willBeTomorrow: compare.curry(1),
		
		// Aus dem Ext-Framework (http://www.extjs.com/)
		removeTime: function(clone) {
			if (clone) {
				return this.clone().removeTime();
			}
			
			this.setHours(0);
			this.setMinutes(0);
			this.setSeconds(0);
			this.setMilliseconds(0);
			
			return this;
		},
		
		// Aus dem Ext-Framework (http://www.extjs.com/)
		clone: function() {
			return new Date(this.getTime());
		}
	});
	
	Object.extend(Date, {
		create: function(str) {
			if (str.constructor === Date) {
				return str;
			}
			
			var ms = Date.parse(str.replace("-", "/"));
			return isNaN(ms) ? null : new Date(ms);
		},
		
		getCurrentTimestamp: function() {
			return new Date().getTimestamp();
		},
		
		getTodaysTimestamp: function() {
			return new Date().removeTime().getTimestamp();
		},
		
		fromTimestamp: function(timestamp) {
			return new Date(timestamp * 1000);
		},
		
		/**
		 * Eine Auflistung der Wochentagenamen, beginnend mit dem Sonntag.
		 * @type {String[]}
		*/
		weekdays: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
		
		/**
		 * Eine Auflistung der Wochentagenamen in abgekürzter Form, beginnend mit dem Sonntag.
		 * @type {String[]}
		*/
		weekdaysAbbr: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
		
		/**
		 * Eine Auflistung der Anzahl Tage in den einzelnen Monaten, beginnend mit Januar.
		 * @type {Integer[]}
		*/
		daysPerMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
		
		/**
		 * Eine Auflistung der Monatsnamen, beginnend mit Januar.
		 * @type {String[]}
		*/
		months: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
	});
})();


$D = Date.create;

Object.extend(PeriodicalExecuter.prototype, {
	enable: function() {
		if (!this.timer) {
			this.registerCallback();
		}
	}
});

PeriodicalExecuter.prototype.disable = PeriodicalExecuter.prototype.stop;

Element.addMethods({
	clear: function(element) {
		element.innerHTML = "";
		return element;
	},
	
	setVisibility: function(element, v) {
		element = $(element);
		
		if (v) {
			element.show();
		} else {
			element.hide();
		}
	},
	
	// Eric's weblog: JavaScript: Scroll to Bottom of a Div - http://radio.javaranch.com/pascarello/2005/12/14/1134573598403.html
	scrollToBottom: function(element) {
        element.scrollTop = element.scrollHeight;
        return element;
	},
	
	scrollToTop: function(element) {
		element.scrollTop = "0px";
		return element;
	},
	
	centerOnScreen: function(element) {
		return element.centerVertically().centerHorizontally();
	},
	
	centerVertically: function(element) {
		var windowSize = Tools.getWindowSize();
        var top = (windowSize.height - parseInt(element.getStyle("height"), 10)) / 2;
        
        return element.setStyle({ top: top.limitTo(0, windowSize.height) + "px" });
	},
	
	centerHorizontally: function(element) {
		var windowSize = Tools.getWindowSize();
		var left = (windowSize.width - parseInt(element.getStyle("width"), 10)) / 2;
		
		return element.setStyle({ left: left.limitTo(0, windowSize.width) + "px" });
	},
	
    createChild: function(element, options, position) {
        options = Object.extend({ tag: "div" }, options || {});
        position = position || "bottom";
        
        var attributes = {};
        var insertion = {};
        
        for (a in options) {
            if (a === "tag" || a === "style" || a === "content") {
				continue;
            }
            
            attributes[a] = options[a];
        }
        
        var child = new Element(options.tag, attributes);
        
        if (options.style) {
			child.setStyle(options.style);
		}
		
        if (options.content) {
			child.innerHTML = options.content;
		}
        
        insertion[position] = child;
        
        $(element).insert(insertion);
        
        return child;
    },
    
    insertControl: function(element, control, position) {
		var insertion = {};
		
		position = position || "bottom";
		insertion[position] = control.element;
		
        $(element).insert(insertion);
        
		control.fireEvent("insert");
        
        return control;
    }
});

Hash.addMethods({
	nonDestructiveUpdateFromArray: function(newElements, identifier, addFunction) {
		identifier = identifier || "id";
		
		var self = this;
		
		newElements.each(function(newElement) {
			var oldElement = self.get(newElement[identifier]);
			
			if (oldElement) {
				oldElement.__updated__ = true;
				oldElement.update(newElement);
			} else {
				var newEntry = Object.isFunction(addFunction) ? addFunction(newElement) : newElement;
				newEntry.__updated__ = true;
				self.set(newElement.id, newEntry);
			}
		});
		
		this.each(function(pair) {
			if (pair.value.__updated__) {
				delete pair.value.__updated__;
			} else {
				self.unset(pair.key);
			}
		});
	}
});

/**
 * Ermöglicht es, auf einfache Art und Weise Cookies zu erstellen bzw. zu löschen, und den Wert von bestehenden Cookies
 * zu erfahren.
 * @class
 * @static
*/
var Cookie = {
	/**
	 * Gibt den Wert eines bestimmten Cookies zurück.
	 * @param {String} name Der Name des betreffenden Cookies.
	 * @returns {String} Der Wert des Cookies.
	*/
	get: function(name) {
		var start = document.cookie.indexOf(name + "=");
		var len = start + name.length + 1;
		
		if ((!start && name !== document.cookie.substring(0, name.length)) || start === -1) {
			return null;
		}
		
		var end = document.cookie.indexOf(";", len);
		end = (end === -1) ? document.cookie.length : end;
		
		return document.cookie.substring(len, end).unescapeHTML();
	},
	
	/**
	 * Legt den Wert für ein bestimmtes Cookie fest.
	 * @param {String} name Der Name des betreffenden Cookies.
	 * @param {String} value Der Wert, der dem betreffenden Cookie gegeben werden soll.
	*/
	set: function(name, value) {
		var expires = new Date(Date.getCurrentTimestamp() + 31536000000);
		document.cookie = name + "=" + value.escapeHTML() + ";expires=" + expires.toGMTString();
	},
	
	/**
	 * Löscht ein bestimmtes Cookie.
	 * @param {String} name Der Name des betreffenden Cookies.
	*/
	remove: function(name) {
		if (Cookie.get(name)) {
			document.cookie = name + "=;expires=Thu, 01-Jan-1970 00:00:01 GMT";
		}
	}
};

/**
 * Enthält verschiedene Hilffunktionen, die sich sonst nirgendwo unterbringen lassen.
 * @class
 * @static
*/
var Tools = {
	/**
	 * Erzeugt eine zufällige alphanummerische Zeichenfolge einer bestimmten Länge. Diese Funktion wird zum Generieren
	 * von IDs für Elemente, Objekte vom Typ <em>Collection</em> usw. verwendet.
	 * @param {Integer} [a] Die Länge der zu erzeugenden Zeichenfolge. Standardwert ist 32.
	 * @returns {String} Die erzeugte Zeichenfolge.
	*/
	generateRandomString: function(a) {
		return $R(1, a || 32).collect(function(i) {
			return "abcdefghiklmnopqrstuvwxyz01234567890123456789".charAt(Math.random() * ((i === 1) ? 25 : 45));
		}).join("");
	},
	
    getWindowSize: function() {
		var getSize = function(a) {
			return window["inner" + a] || document.documentElement["client" + a] || document.body["client" + a] - 5 || 0;
		};
		
		return {
			width: getSize("Width"),
			height: getSize("Height")
		};
	}
};

Object.extend(Event, (function() {
		var navEvents = $w("TAB ESC LEFT UP RIGHT DOWN HOME END PAGEUP PAGEDOWN INSERT");
		
		return {
			isNavigationKey: function(e) {
				var k = e.keyCode;
				
				navEvents.any(function(navEvent) {
					return k === Event["KEY_" + navEvent];
				});
			},
			
			KEY_SPACE: 32
		};
})());

var Collection = Class.create(Hash, EventPublisher.prototype, {
	initialize: function($super, object) {
		$super(object);
		
		EventPublisher.prototype.initialize.call(this);
	},
	
	set: function($super, value) {
		var key = "id-" + Collection.KEY_COUNTER;
		
		$super(key, value);
		Collection.KEY_COUNTER++;
		
		this.fireEvent("addValue", { key: key, value: value });
		
		return { key: key, value: value };
	},
	
	unset: function($super, key, silent) {
		if (Object.isDefined(this.get(key))) {
			var value = $super(key);
			
			if (!silent) {
				this.fireEvent("removeValue", { key: key, value: value });
			}
			
			return value;
		}
	},
	
	clear: function() {
		this.keys().each(function(key) {
			this.unset(key, true);
		}, this);
		
		this.fireEvent("clear");
	}
});

Collection.KEY_COUNTER = 0;

Collection.prototype.add = Collection.prototype.set;
Collection.prototype.remove = Collection.prototype.unset;

var ControlCollection = Class.create(Collection, {
	set: function($super, value) {
		value.on("remove", this.unset.bind(this, $super(value).key));
	},
	
	removeAll: function() {
		this.values().invoke("remove");
	}
});

ControlCollection.prototype.add = ControlCollection.prototype.set;

var WindowCollection = Class.create(ControlCollection, {
	hasWindowOfType: function(type) {
		return this.find(function(pair) {
			return pair.value.type === type;
		});
	},
	
	closeAllOfType: function(type) {
		this.findAll(function(pair) {
			return pair.value.type === type;
		}).pluck("value").invoke("close");
	},
	
	getNumberOfOpenWindows: function() {
        return this.findAll(function(pair) {
			return !pair.value.removed && pair.value.visible();
        }).length;
	}
});

WindowCollection.prototype.closeAll = ControlCollection.prototype.removeAll;