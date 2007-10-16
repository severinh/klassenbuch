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
 * @fileOverview Hilfsdatei, die eine Reihe von grundlegenden Klassen und Funktionen bereitstellt, die überall im
 * Klassenbuch Verwendung finden. Ein Teil davon sind direkte Ergänzungen zum Funktionsumfang des verwendeten
 * JavaScript-Frameworks <a href="http://www.prototypejs.org/">Prototype</a> wie zum Beispiel die Funktionen, die
 * mit Prototype den DOM-Elementen hinzugefügt werden. In dieser Datei sind weitere Klassen zur Kommunikation mit dem
 * Server enthalten (speziell für das JSON-Format), ein Objekt, dass zusätzliche Informationen über den verwendeten
 * Browser bereitstellt usw..
 * @author <a href="mailto:severinheiniger@gmail.com">Severin Heiniger</a>
*/

/**
 * Verschiedene zusätzliche statische Methoden für <em>Object</em>, die grundlegendste "Klasse" in JavaScript. Bereits
 * Prototype fügt mit <em>extend</em> usw. verschiedene sehr grundlegende statische Methoden hinzu. Diese Funktionen
 * werden in der <a href="http://www.prototypejs.org/api/object">API-Dokumentation von Prototype</a> ausführlich
 * beschrieben.
 * @class
*/
Object.extend(Object, /** @scope Object */ {
	/**
	 * Mit dieser statischen Methode lässt sich überprüfen, ob eine Variable den Wert <em>null</em> hat oder nicht.
	 * Wenn die Variable nicht definiert ist, gibt diese Methode also <em>false</em> zurück.
	 * @param object Die zu überprüfende Variable.
	 * @returns {Boolean} Ob die Variable <em>null</em> ist oder nicht.
	 * @static
	*/
	isNull: function(object) {
		return object === null;
	},
	
	/**
	 * Mit dieser statischen Methode lässt sich überprüfen, ob eine Variable definiert ist oder nicht.
	 * @param object Die zu überprüfende Variable.
	 * @returns {Boolean} Ob die Variable definiert ist oder nicht.
	 * @static
	*/
	isDefined: function(object) {
		return !Object.isUndefined(object);
	},
	
	// http://www.heise.de/ix/artikel/2001/04/194/03.shtml
	instanceOf: function(object, constructor) {
		while (!Object.isNull(object)) {
			if (object === constructor.prototype) {
				return true;
			}
			
			object = object.__proto__;
		}
		
		return false;
	},
	
	/**
	 * Mit dieser statischen, rekursiven Methode lässt sich eine tiefe Kopie eines beliebigen Objekts erstellen. Im
	 * Gegensatz zur Funktion Object.clone des Prototype-Frameworks werden mit cloneDeeply nicht nur die Eigenschaften,
	 * sondern auch die Eigenschaften der Eigenschaften eines Objekts kopiert.
	 * @param object Das zu kopierende Objekt.
	 * @returns {Object} Die Kopie des Objekts.
	 * @static
	*/
	cloneDeeply: function(source) {
		var result = {};
		
		for (property in source) {
			if (typeof source[property] === "object") {
				result[property] = Object.cloneDeeply(source[property]);
			} else {
				result[property] = source[property];
			}
		}
		
		return result;
	}
});

Object.extend(Prototype.Browser, (function() {
	var version = 0;
	var ua = navigator.userAgent.toLowerCase();
	var isFirefox = (Prototype.Browser.Gecko && ua.include("firefox"));
	
	if (Prototype.Browser.IE) {
		version = (!Object.isNull((new RegExp("msie ([0-9]{1,}[\.0-9]{0,})")).exec(ua))) ? parseFloat(RegExp.$1) : 3;
	} else if (Prototype.Browser.Opera) {
		version = (window.opera.version) ? parseFloat(window.opera.version()) : 7.5;
	} else if (isFirefox) {
		version = parseFloat(ua.substr(ua.indexOf("firefox") + 8, 3));
	}
	
	return {
		supportsCookies: (function() {
			if (navigator.cookieEnabled) {
				return true;
			}
			
			if (!Object.isDefined(navigator.cookieEnabled)) {
				Cookie.set("testcookie", "testvalue");
				
				if (Cookie.get("testcookie") === "testvalue") {
					Cookie.remove("testcookie");
					return true;
				}
			}
			
			return false;
		})(),
		
		Firefox: isFirefox,
		IE6: (Prototype.Browser.IE && version === 6),
		version: version,
		
		supported: !((isFirefox && version < 1.5) || (Prototype.Browser.IE && version < 6))
	};
})());

var Browser = Prototype.Browser;

var JSONRPC = {
	SERVICE_FILE: "server.service.php",
	
	ERROR_CODE: {
		AUTHENTICATION_FAILED: 800,
		INVALID_DATABASE_QUERY: 801,
		INVALID_RESPONSE: 850
	}
};

/**
 * Diese Klasse ermöglicht es, eine JSON-Anfrage an den Server zu senden, wobei sie das Einlesen und Validieren der
 * Antwort, die ebenfalls im JSON-Format erfolgt, übernimmt. Bei einer 
 * @param {String} method Der Name der Methode, die auf dem Server aufgerufen werden soll. Z. B. <em>gettasks</em>,
 * um eine Liste der Aufgaben zu erhalten.
 * @param {Array} params Allfällige Parameter, die an die Funktion auf Serverseite übergeben werden sollen.
 * Standardwert ist <em>[]</em>.
 * @param {Object} options Enthält die verschiedenen Callback-Funktionen wie <em>onSuccess</em>, <em>onFailure</em>
 * und <em>onComplete</em>. Diese werden aufgerufen, wenn die Abfrage erfolgreich verläuft bzw. fehlschlägt usw.
 * @class
 * @inherits Ajax.Request
*/
JSONRPC.Request = Class.create(Ajax.Request, /** @scope JSONRPC.Request.prototype */ {
	/** @ignore */
	initialize: function($super, method, params, options) {
		// Legt die Standardfunktionen für die Callback-Funktionen fest. Wird für "onFailure" keine Funktion übergeben,
		// wird eine Funktion aufgerufen, die eine simple Fehlermeldung ausgibt.
		options = Object.extend({
			onSuccess: Prototype.K,
			onComplete: Prototype.K,
			
			onFailure: function(response) {
				response.standardErrorAlert();
			}
		}, options || {});
		
		// Der Inhalt von postBody ist der eigentliche Inhalt, der an den Server gesendet wird. Falls der Browser
		// Cookies nicht unterstützt, muss zusätzlich die Benutzer-ID und das Benutzer-Token mitgesendet werden,
		// sofern der Benutzer angemeldet ist
		var postBody = $H(Object.extend((User.signedIn && !Prototype.Browser.supportsCookies) ? {
			userid: User.id, token: User.token } : {}, { method: method, params: params || [] })).toJSON();
		
		// Der Konstruktor von Ajax.Request wird aufgerufen.
		// Der Dateiname der JSONRPC-Service-Datei ist in "JSONRPC.SERVICE_FILE" festgelegt.
		$super(JSONRPC.SERVICE_FILE, {
			// Falls irgendein client-seitiger Fehler auftritt.
			onException: (function(e) {
				options.onFailure(new JSONRPC.Response(null, 999, e.message || "Unbekannter Fehler." ));
			}).bind(this),
			
			// Verarbeitet die Antwort des Servers
			onComplete: (function(response) {
				if (this.success()) { // Kein HTTP-Fehler aufgetreten
					var json = response.responseJSON;
					
					if (json) { // Antwort konnte eingelesen werden (Gültiges JSON-Format)
						if (json.result && Object.isNull(json.error)) { // Positive Antwort
							options.onSuccess(new JSONRPC.Response(json.result));
						} else {
							options.onFailure(new JSONRPC.Response(null, json.error.faultCode, json.error.faultString));
						}
					} else {
						options.onFailure(new JSONRPC.Response(null, 850, "Einlesen der Server-Antwort fehlgeschlagen"));
					}
				} else {
					options.onFailure(new JSONRPC.Response(null, this.transport.status, "HTTP-Fehler " + this.transport.status));
				}
				
				options.onComplete(response);
			}).bind(this) || Prototype.K,
			
			contentType: "application/javascript",
			postBody: postBody,
			
			// Muss gesetzt werden, damit die Antwort von der Basisklasse automatisch eingelesen wird, auch wenn im
			// Antwort-Header als Datentyp JSON nicht angegeben ist. (?)
			evalJSON: "force"
		});
	}
});

/**
 * Diese Klasse repräsentiert eine Antwort auf eine JSONRPC-Anfrage, die mit <a href="JSONRPC.Request.htm">
 * JSONRPC.Request</a> durchgeführt wurde.
 * @param {String} result Die Antwort des Servers.
 * @param {Integer} [faultCode] Der allfällige Fehlercode, falls die Anfrage aus irgendeinem Grund fehlgeschlagen ist.
 * @param {String} [faultString] Der allfällige Fehlermeldung, falls die Anfrage aus irgendeinem Grund fehlgeschlagen ist.
 * @class
*/
JSONRPC.Response = Class.create( /** @scope JSONRPC.Response.prototype */ {
	/** @ignore */
    initialize: function(result, faultCode, faultString) {
        this.result = result;
        this.faultCode = faultCode || 0;
        this.faultString = faultString || "";
    },
    
	/**
	 * Gibt eine standardmässige Fehlermeldung aus, basierend auf der Fehler-ID und der Fehlermeldung, die in der Antwort
	 * des Servers enthalten waren.
	 * @static
	*/
    standardErrorAlert: function() {
		if (this.faultCode) {
			alert("Es ist ein Problem bei der Kommunikation mit dem Server aufgetreten. Lade das Klassenbuch neu und " +
				"versuche es erneut. Wende dich an Severin, falls das Problem bestehen bleibt.\n\nFehlermeldung: " +
				this.faultString + "\nFehlercode: " + this.faultCode);
		}
    }
});

JSONRPC.Upload = Class.create(SWFUpload, {
	initialize: function($super, method, params, options) {
		this.method = method;
		
		if (options.begin_upload_on_queue) {
			this._autoStartUpload = true;
		}
		
		var uploadComplete = function(file, data) {
			this.fireEvent("uploadComplete", file, data);
			
			var parsedData = data.evalJSON();
			
			if (parsedData) {
				if (Object.isNull(parsedData.error) && parsedData.result) {
					this.fireEvent("uploadSuccess", file, new JSONRPC.Response(parsedData.result));
				} else {
					this.fireEvent("uploadFailure", file, new JSONRPC.Response(null, parsedData.error.faultCode, parsedData.error.faultString));
				}
			} else {
				this.fireEvent("uploadFailure", file, new JSONRPC.Response(null, 850, "Einlesen der Server-Antwort fehlgeschlagen"));
			}
			
			if (this._autoStartUpload) {
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
		
		$super(Object.extend({
			// Backend-Einstellungen
			upload_url: 				"../" + JSONRPC.SERVICE_FILE,
			
			file_size_limit: 				"10240",
			file_types: 					"*.*",
			file_types_description: 		"Alle Dateien",
			
			// Flash-Einstellungen
			flash_url: 					    "flash/swfupload.swf",
			
			// Event-Handler
			ui_function:            		this.fireEvent.bind(this, "ready"),
			file_dialog_start_handler:		this.fireEvent.bind(this, "fileDialogStart"),
            file_queued_handler:            this.fireEvent.bind(this, "fileQueued"),
            file_dialog_complete_handler:	this.fireEvent.bind(this, "fileDialogComplete"),
            
            upload_start_handler:			this.fireEvent.bind(this, "uploadStart"),
            upload_progress_handler:		this.fireEvent.bind(this, "uploadProgress"),
			
            file_queue_error_handler:       fileQueueError.bind(this),
            upload_complete_handler:		uploadComplete.bind(this),
            upload_error_handler:			uploadError.bind(this)
		}, options));
		
		this.on("ready", this.setJSONParams.bind(this, params || []));
		
		this.on("uploadComplete", function() {
			if (this.getStats().files_queued == 0) {
				this.fireEvent("queueComplete");
			}
		}, this);
		
		if (this._autoStartUpload) {
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

Object.extend(JSONRPC.Upload, SWFUpload);

Object.extend(Hash.prototype, {
	getLength: function() {
		return this.values().length;
	}
});

Object.extend(Number.prototype, {
	limitTo: function(a, b) {
		return (this < a) ? a : ((this > b) ? b : this);
	},
	
	getFormatedDataSize: function() {
		var scales = ["Byte", "KB", "MB", "GB", "TB"];
		var temp = this;
		var currentScale = 0;
		
		while (temp >= 1024) {
			temp = temp / 1024;
			++currentScale;
		}
		
		return ((temp * 100).round() / 100) + " " + scales[currentScale] + ((currentScale === 0 && temp >= 1) ? "s" : "");
	}
});

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
		return this.replace(/([\s])/g, "").replaceAll("ü", "ue").replaceAll("ä", "ae").replaceAll("ö", "oe").toLowerCase();
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

String.Builder = function() {
	var addOne = Browser.IE ? 
		function(str) {
			this._strings.push(str);
		} :
		
		function(str) {
			this._strings += str;
		};
		
	var get = Browser.IE ?
		function() {
			return this._strings.join("");
		} :
		
		function() {
			return this._strings;
		};
	
	return Class.create({
		initialize: function() {
			this._strings = (Browser.IE) ? [] : "";
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
        
        return element.setStyle({ top: ((top >= 0) ? top : 0) + "px" });
	},
	
	centerHorizontally: function(element) {
		var windowSize = Tools.getWindowSize();
		var left = (windowSize.width - parseInt(element.getStyle("width"), 10)) / 2;
		
		return element.setStyle({ left: ((left >= 0) ? left : 0) + "px" });
	},
    
    createChild: function(element, options, position) {
        options = Object.extend({ tag: "div" }, options || {});
        
        var attributes = {};
        
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
        
        $(element).insert(child, position);
        
        return child;
    },
    
    insertControl: function(element, control, position) {
        $(element).insert(control.element, position);
        
        return control;
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

Event.isNavigationKey = (function() {
	var navEvents = $w("TAB ESC LEFT UP RIGHT DOWN HOME END PAGEUP PAGEDOWN INSERT");
	
	return function(e) {
		var k = e.keyCode;
		
		navEvents.any(function(navEvent) {
			return k === Event["KEY_" + navEvent];
		});
	};
})();

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