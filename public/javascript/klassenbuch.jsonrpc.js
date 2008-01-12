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
		"CLIENT_EXCEPTION": 999
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
			onException: function(request, exception) {
				options.onFailure(new JSONRPC.Response(null, 999, (exception.message || "Unbekannter Fehler") +
					"\nFehlertyp: " + exception.name
				));
			},
			
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
			
			contentType: "application/json",
			
			// The request body actually sent to the server.
			postBody: requestParams.toJSON(),
			
			requestHeaders: {
				"Accept": "application/json"
			},
			
			// Force base class to parse the response, even if the response's content type header isn't correctly set.
			evalJSON: false
		});
	}
});

JSONRPC.CachedRequest = Class.create(JSONRPC.Request, {
	initialize: function($super, method, params, options) {
		options = options || {};
		
		var empty = Prototype.K,
			store = JSONRPC.CachedRequest._store,
			onSuccess = options.onSuccess || empty,
			key = method + params.toJSON();
		
		options = Object.extend({
			onUpdated: empty,
			onUnchanged: empty
		}, options);
		
		options.onSuccess = function(response) {
			onSuccess(response);
			
			if (response.raw && response.raw === store[key]) {
				options.onUnchanged(response);
			} else {
				store[key] = response.raw;
				options.onUpdated(response);
			}
		};
		
		$super(method, params, options);
	}
});

Object.extend(JSONRPC.CachedRequest, {
	clearCache: function() {
		JSONRPC.CachedRequest._store = {};
	},
	
	_store: {}
});

/**
 * Represents an answer to a JSONRPC request initiated with JSONRPC.Request or JSONRPC.Upload.
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
	var result = null, faultCode = 0, faultString = "", raw = "";
	
	// Handle Ajax.Response object.
	response = response.responseText || response;
	
	// Mark response as invalid.
	/** @ignore */
	var invalidResponse = function() {
		faultCode = 850;
		faultString = "Einlesen der Server-Antwort fehlgeschlagen";
	};
	
	if (Object.isString(response)) { // Need to parse response string first.
		raw = response;
		
		try {
			response = response.evalJSON(true);
		} catch(e) { // Malformed JSON string.
			invalidResponse();
		}
	}
	
	// Check if parsed JSON response follows the JSONRPC specifications.
	if (response) {
		if (Object.isDefined(response.result)) {
			result = response.result;
		} else if (Object.isDefined(response.error)) { // There was an error processing the JSONRPC request.
			faultCode = response.error.faultCode;
			faultString = response.error.faultString;
		} else {
			invalidResponse();
		}
	} else {
		invalidResponse();
	}
	
	// Generate JSONRPC.Response object.
	var responseObj = new JSONRPC.Response(result, faultCode, faultString);
	
	responseObj.raw = raw;
	
	return responseObj;
};

/**
 * Makes it possible to upload multiple files to a JSONRPC web service using Adobe Flash and JavaScript. This class is based on a
 * <a href="http://swfupload.praxion.co.za/">fork of SWFUpload</a>. This subclass provides a solid error handling mechanism and integrates
 * the Observable functionality.
 * @param {String} method Name of the method to be called on the server.
 * @param {Array} params Optional parameter to be passed to the service function. Default value is <em>[]</em>.
 * @param {Object} options May contain various callback function such as <em>onSuccess</em>, <em>onFailure</em>
 * and <em>onComplete</em>, which are called in case the request is successful respectively if it has failed. Additionaly, you can specify
 * a file size limit, accepted file types, wheter a file upload should start immediately after the file selection.
 * @example
new JSONRPC.Upload("foobar", [], {
	onSuccess: function(file, response) {
		alert("File " + file.name + " was uploaded successfully.);
	},
	
	onFailure: function(file, response) {
		alert("Bad luck. Something went wrong.\nError message:" + response.faultString);
	}
});
*/
JSONRPC.Upload = Class.create(SWFUpload, {
	initialize: function($super, method, params, options) {
		/**
		 * Name of the method to be called on the server.
		 * @type String
		*/
		this.method = method;
		
		options = Object.extend({
			service_file: 					JSONRPC.SERVICE_FILE,
			begin_upload_on_queue: 			false,
			
			file_size_limit: 				10240,
			file_types_description: 		"Alle Dateien"
		}, options || {});
		
		/** @ignore */
		var uploadComplete = function(file) {
			this.fireEvent("uploadComplete", file);
			
			if (options.begin_upload_on_queue) {
				this.startUpload();
			}
		};
		
		var uploadSuccess = function(file, data) {
			var response = JSONRPC.Response.fromAjaxResponse(data);
			
			this.fireEvent((response.success()) ? "uploadSuccess" : "uploadFailure", file, response);
		};
		
		/** @ignore */
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
		
		/** @ignore */
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
			upload_success_handler:			uploadSuccess.bind(this),
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

JSONRPC.Store = Class.create(Collection, {
	initialize: function($super, options) {
		$super();
		
		this.options = options || {};
		this.loading = false;
		this.loaded = false;
		
		if (this.options.inlineData) {
			this.loadData(this.options.inlineData);
		} else if (this.options.autoLoad) {
			this.load.bind(this).defer();
		}
		
		this.on("clear", function() {
			this.loaded = false;
		}, this);
	},
	
	getItems: function(a, b) {
		return this.findAll(function(item) {
			return item[a] === b;
		});
    },
	
	getItem: function(a, b) {
		return this.find(function(item) {
			return item[a] === b;
		});
	},
	
    load: function(method, params, appendOnly) {
        if (this.fireEvent("beforeload")) {
			this.loading = true;
			
			var method = method || this.options.method;
			var params = Function.fromObject(params || this.options.params || []);
			var appendOnly = appendOnly || this.options.appendOnly || false;
			
			var request = new JSONRPC.CachedRequest(method, params(), Object.extend({
				onUpdated: (function(response) {
					this.loadSuccess(response, appendOnly);
				}).bind(this)
			}, (this.options.suppressErrors) ? { onFailure: Prototype.K } : {}));
        }
    },
	
	loadData: function(data) {
		this.loadSuccess(data instanceof JSONRPC.Response ? data : new JSONRPC.Response(data));
	},
	
	loadSuccess: function(response, appendOnly) {
		var ItemClass = this.options.itemClass,
			self = this,
			newItems = [];
		
		if (response && response.result) {
			response.result.each(function(newElement) {
				var oldElement = self.get(newElement.id);
				
				if (oldElement) {
					if (!appendOnly) {
						oldElement.__updated__ = true;
					}
					
					oldElement.update(newElement);
				} else {
					var newEntry = new self.options.itemClass(newElement);
					
					if (!appendOnly) {
						newEntry.__updated__ = true;
					}
					
					newItems.push(newEntry);
					self.add(newEntry);
				}
			});
			
			if (!appendOnly) {
				this.each(function(item) {
					if (item.__updated__) {
						delete item.__updated__;
					} else {
						self.unset(item.id);
					}
				});
			}
		}
		
		this.loading = false;
		this.loaded = true;
		
		this.enablePeriodicalUpdate();
		
		this.fireEvent("updated", newItems);
	},
	
	enablePeriodicalUpdate: function() {
		if (this.options.periodicalUpdate) {
			if (this.periodicalUpdate) {
				this.periodicalUpdate.enable();
			} else {
				this.periodicalUpdate = new PeriodicalExecuter((function() {
					this.load();
				}).bind(this), this.options.periodicalUpdate);
			}
		}
	},
	
	count: function() {
		return (this.loaded) ? this.keys().length : this.options.unloadedCount || 0;
	}
});
