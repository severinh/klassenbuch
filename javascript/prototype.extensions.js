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
 * @class Some extensions to native JavaScript numbers.
 * @name Number
*/
Object.extend(Number.prototype, function() {
	var scales = $w("Byte KB MB GB TB");
	
	return /** @scope Number.prototype */ {
		/**
		 * Checks if the number is between a lower and a upper limit. If the number is outside of the specified range,
		 * the method returns the nearest number that is within the allowed range.
		 * @param {Number} a The lower limit
		 * @param {Number} b The upper limit
		 * @returns {Number} The number that is within the specified range.
		 * @example
(1).limitTo(2, 8);
// -> 2
(12).limitTo(2, 8);
// -> 8
(5).limitTo(2, 8);
// -> 5
		*/
		limitTo: function(a, b) {
			return (this < a) ? a : ((this > b) ? b : this);
		},
		
		/**
		 * Adds the appropriate file size unit to number representing a data size.
		 * @param {Number} [roundTo] The number of decimal places to be returned.
		 * @returns {String} The resulting data size string.
		 * @example
(2187393).getFormatedDataSize();
// -> "2.09 MB"
(1).getFormatedDataSize();
// -> "1 Byte"
		*/
		getFormatedDataSize: function(roundTo) {
			var temp = this;
			var currentScale = 0;
			
			while (temp >= 1024) {
				temp = temp / 1024;
				++currentScale;
			}
			
			return temp.roundTo(roundTo || 2) + " " + scales[currentScale] +
				((currentScale === 0 && (temp == 0 || temp > 1)) ? "s" : "");
		},
		
		/**
		 * Rounds the number to a certain decimal places.
		 * @param {Number} a The number of decimal places.
		 * @returns {Number} The rounded number.
		 * @example
(3.1415).roundTo(2);
// -> 3.14
		*/
		roundTo: function(a) {
			return (this * Math.pow(10, a)).round() / Math.pow(10, a);
		}
	};
}());

Function.fromObject = function(object) {
	return (Object.isFunction(object)) ? object : function() {
		return object;
	};
};

/**
 * @class Some extensions to native JavaScript strings. The methods added to String.prototype by the Prototype JavaScript
 * Framework are described in the <a href="http://www.prototypejs.org/api/object">Prototype API Documentation</a>.
 * @name String
*/
Object.extend(String.prototype, /** @scope String.prototype */ {
	/**
	 * Returns the number of times a certain string occurs in the string.
	 * @param {String} a The string to be searched for.
	 * @returns {Integer} The number of occurrences.
	 * @example
"hello world!".count("l");
// -> 3
	*/
	count: function(a) {
		if (a === "") { // Behave well if the needle is a blank string.
			return 0;
		}
		
		return this.split(a).length - 1;
	},
	
	/**
	 * Capitalizes every word in a string separated by a space character.
	 * @param {String} [value] The character that represents a gap between two words. Defaults to " ".
	 * @returns {String} The capitalized string.
	 * @example
"hello world!".capitalize();
// -> "Hello World!"
	*/
	capitalize: function(value) {
		return this.split(value || " ").collect(function(a) {
			return a.charAt(0).toUpperCase() + a.substring(1);
		}).join(value || " ");
	},
	
	/**
	 * Lowercases the first character in the string.
	 * @returns {String} The resulting string.
	 * @example
"FooBar".capitalize();
// -> "fooBar"
	*/
	lowerFirstLetter: function() {
		return this.charAt(0).toLowerCase() + this.substring(1);
	},
	
	/**
	 * Checks if the string is a valid mail address.
	 * @returns {Boolean} Valid or not.
	* @example
"somebody@example.com".isValidMailAddress();
// -> true

"_somebody@example.c".isValidMailAddress();
// -> false
	*/
	isValidMailAddress: function() {
		var regExp = /^[a-zA-Z0-9]+[_a-zA-Z0-9-]*(\.[_a-z0-9-]+)*@[a-z??????0-9]+(-[a-z??????0-9]+)*(\.[a-z??????0-9-]+)*(\.[a-z]{2,4})$/;
		return regExp.test(this);
	},
	
	/**
	 * Turns the string into a more URL-friendly version that has no whitespaces and special charactes such as German
	 * umlauts. This method uses an internal cache that causes a significant performance improvment when addressifying
	 * a string two or more times.
	 * @returns {String} The addressified string.
	 * @example
"A string with a German umlaut: ö".addressify();
// -> "a-string-with-a-german-umlaut-"
	*/
	addressify: function() {
		var store = arguments.callee._STORE[this];
		
		if (Object.isDefined(store)) {
			return store;
		}
		
		return arguments.callee._STORE[this] = this.toLowerCase()
			.replace(/\s/g, "-")
			.replace(/[^A-Z^0-9-]/gi, "");
	},
	
	/**
	 * Strips all leading and trailing whitespace from the string. This method overwrites the one shipped with Prototype,
	 * because it's considered faster.
	 * @returns
	 * @example
"    hello world!    ".strip();
// -> "hello world!"
	*/
	strip: function() {
		// Strip all leading whitespaces.
		str = this.replace(/^\s+/, "");
		
		// Now the more complicated part.
		for (var i = str.length - 1; i > 0; i--) {
			if (/\S/.test(str.charAt(i))) {
				str = str.substring(0, i + 1); break;
			}
		}
		
		return str;
	}
});

/** @ignore This is an internal cache used by String#addressify. */
String.prototype.addressify._STORE = {};

/**
 * Provides methods to dynamically create and remove cookies.
 * @namespace
*/
var Cookie = {
	/**
	 * Returns the value of a certain cookie.
	 * @param {String} name The name of the cookie to read.
	 * @returns {String} The cookie's value. Returns false if the cookie doesn't exist.
	*/
	get: function(name) {
		var cookie = document.cookie;
		var start = cookie.indexOf(name + "=");
		
		if (start === -1) {
			return false;
		}
		
		var len = start + name.length + 1;
		var end = cookie.indexOf(";", len);
		
		return cookie.substring(len, (end === -1) ? cookie.length : end);
	},
	
	/**
	 * Creates respecively edits a cookie. Both a value and the name of the cookie need to be specified.
	 * @param {String} name The name of the cookie to create.
	 * @param {String} value The value to be assigned to this cookie.
	*/
	set: function(name, value) {
		document.cookie = name + "=" + value + ";expires=" + new Date().add(1, "year").toGMTString();
	},
	
	/**
	 * Removes a certain cookie.
	 * @param {String} name The name of the cookie to remove.
	*/
	remove: function(name) {
		document.cookie = name + "=;expires=Thu, 01-Jan-1970 00:00:01 GMT";
	}
};

/**
 * Provides various methods to get the browser window inner dimensions (so called viewport), which can be used to center elements on
 * screen or to cover the whole screen with a single element. This definition overrides the original Prototype defition to improve
 * performance.
 * @namespace
 * @name document.viewport
*/
Object.extend(document.viewport, function() {
	// Shortcuts to reduce code size and improve code readability.
	var B = Prototype.Browser;
	
	// The getter function that differs from browser to browser (prevent wrong calculations due to scroll bars). 
	var get = (B.WebKit && !document.evaluate)
		? function(D) { return self["inner" + D]; }
		: (B.Opera)
			? function(D) { return document.body["client" + D]; }
			: function(D) { return document.documentElement["client" + D] };

	return {
		/**
		 * Returns both the viewport's width and height in pixels.
		 * @returns {Object} The viewport's dimensions.
		 * @example
document.viewport.getDimensions();
// -> { width: 1280, height: 725 }
		*/
		getDimensions: function() {
			return { width: get("Width"), height: get("Height") };
		},

		/**
		 * Returns the viewport's width in pixels.
		 * @returns {Object} The viewport's width.
		 * @example
document.viewport.getWidth();
// -> 1280
		*/
		getWidth: function() {
			return get("Width");
		},

		/**
		 * Returns the viewport's height in pixels.
		 * @returns {Object} The viewport's height.
		 * @example
document.viewport.getHeight();
// -> 725
		*/
		getHeight: function() {
			return get("Height");
		}
	};
}());

/**
 * Some extensions to Prototype's browser detection functionality (<em>Prototype.Browser</em>). It checks whether the browser supports
 * cookies or is supported in general.
 * @namespace
 * @name Prototype.Browser
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
		 * Indicates whether the used browser should be able to run the application smoothly. Currently Firefox versions older than 1.5
		 * and IE versions older than 6 aren't supported.
		 * @todo Should be moved to a more reasonable place.
		 * @type Boolean
		*/
		supported: !((isFirefox && version < 1.5) || (B.IE && version < 6))
	};
})());

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
	
	/** @ignore */
	var compare = function(add) {
		return this.removeTime(true).equals(new Date().removeTime().add(add));
	};
	
	/**
	 * @class Some extensions to native JavaScript dates. The methods added to Date.prototype by the Prototype JavaScript
	 * Framework are described in the <a href="http://www.prototypejs.org/api/date">Prototype API Documentation</a>.
	 * @name Date
	*/
	Object.extend(Date.prototype, {
		/**
		 * Makes it possible to iterate through date ranges using $R. One iteration step spans one day.
		 * @example
$R(new Date(), new Date().add(3, "days")).invoke("format", "d.m.Y").join(", ");
// -> "08.12.2007, 09.12.2007, 10.12.2007, 11.12.2007"
		*/
		succ: function() {
			return new Date(this.getTime() + multipliers.get("day"));
		},
		
		/**
		 * Adds a specific amount of time to the date object. In addition to the numerical amount of time a textual time unit can be
		 * specified that can be both singular and plural. Even negative values are allowed.
		 * @param {Number} number The amount of time to add.
		 * @param {String} [unit] The textual time unit to be used. Defaults to "day".
		 * @example
new Date().format("d.m.Y H:i");
// -> "08.12.2007 22:05"
new Date().add(23, "days").format("d.m.Y H:i");
// -> "31.12.2007 22:05"
new Date().add(-3, "minutes").format("d.m.Y H:i");
// -> "08.12.2007 22:02"
		*/
		add: function(number, unit) {
			this.setTime(this.getTime() + number * multipliers.get(unit || "day"));
			return this;
		},
		
		diff: function(date, unit, allowDecimal) {
			var ms = this.getTime() - date.getTime();
			var unitDiff = ms / multipliers.get(unit || "day");
			
			return allowDecimal ? unitDiff : Math.floor(unitDiff);
		},
		
		// Inspiriert von http://www.codeproject.com/jscript/dateformat.asp
		format: function(f) {
			var self = this,
				hours = this.getHours(),
				a = (hours < 12) ? "am" : "pm",
				g = (hours >= 12) ? hours - 12 : hours,
				G = hours,
				j = this.getDate(),
				n = this.getMonth() + 1;
			
			return f.replace(/[aAdDFgGhHijmnMsY]/g, function($1) {
				switch ($1) {
					case "a": return a;
					case "A": return a.toUpperCase();
					case "d": return j.toPaddedString(2);
					case "D": return Date.weekdaysAbbr[self.getDay()];
					case "F": return Date.months[self.getMonth()];
					case "g": return g;
					case "G": return G;
					case "h": return g.toPaddedString(2);
					case "H": return G.toPaddedString(2);
					case "i": return self.getMinutes().toPaddedString(2);
					case "j": return j;
					case "m": return n.toPaddedString(2);
					case "n": return n;
					case "M": return Date.months[self.getMonth()].substr(0, 3);
					case "s": return self.getSeconds().toPaddedString(2);
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
			return this.getTime() === date.getTime();
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
		weekdays: $w("Sonntag Montag Dienstag Mittwoch Donnerstag Freitag Samstag"),
		
		/**
		 * Eine Auflistung der Wochentagenamen in abgekürzter Form, beginnend mit dem Sonntag.
		 * @type {String[]}
		*/
		weekdaysAbbr: $w("So Mo Di Mi Do Fr Sa"),
		
		/**
		 * Eine Auflistung der Anzahl Tage in den einzelnen Monaten, beginnend mit Januar.
		 * @type {Integer[]}
		*/
		daysPerMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
		
		/**
		 * Eine Auflistung der Monatsnamen, beginnend mit Januar.
		 * @type {String[]}
		*/
		months: $w("Januar Februar März April Mai Juni Juli August September Oktober November Dezember")
	});
})();

PeriodicalExecuter.addMethods({
	enable: function() {
		if (!this.timer) {
			this.registerCallback();
		}
	},
	
	setFrequency: function(frequency) {
		if (frequency !== this.frequency) {
			this.disable();
			
			if (frequency !== 0) {
				this.frequency = frequency;
				this.enable();
			}
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
		var windowHeight = document.viewport.getHeight();
        var top = (windowHeight - parseInt(element.getStyle("height"), 10)) / 2;
        
        return element.setStyle({ top: top.limitTo(0, windowHeight) + "px" });
	},
	
	centerHorizontally: function(element) {
		var windowWidth = document.viewport.getWidth();
		var left = (windowWidth - parseInt(element.getStyle("width"), 10)) / 2;
		
		return element.setStyle({ left: left.limitTo(0, windowWidth) + "px" });
	},
	
    createChild: function(element, options, position) {
        options = Object.extend({ tag: "div" }, options || {});
        
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
        
        insertion[position || "bottom"] = child;
        
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

Class.Methods.alias = function(source, destination) {
	this.prototype[destination] = this.prototype[source];
	
	return this;
};

/**
 * Eine abstrakte Basisklasse, die eine Möglichkeit bereitstellt, Ereignisse auszulösen. Über die Methode
 * <a href="#addListener">addListener</a> bzw. ihren Alias <a href="#on">on</a> kann ein bestimmtes Ereignis abgehört
 * werden. Mit <a href="#fireEvent">fireEvent</a> wird einbestimmtes Ereignis ausgelöst.<br /><br />Diese Klasse basiert
 * auf der Klasse <a href="http://www.someelement.com/2007/03/eventpublisher-custom-events-la-pubsub.html">EventPublisher
 * </a> von Ryan Dahl.
 * @class
 * @example
var MyClass = ClassObsolete.create(EventPublisher, {
	initialize: function($super) {
		$super();
	},
	
	saySomeThing: function() {
		this.fireEvent("say");
	}
});

var myInstance = new MyClass();
myInstance.on("say", function() {
	alert("myInstance hat etwas gesagt");
});
*/
var EventPublisher = Class.create( /** @scope EventPublisher.prototype */ {
    initialize: function() {
		/**
		 * Enthält alle Ereignis-Handler die mit der Methode <a href="#addListener">addListener</a> registriert wurden.
		 * Die Ereignis-Handler sind nach den dazugehörigen Ereignissen geordnet.
		 * @type Object
		 * @name _events
		 * @memberof EventPublisher
		*/
        this._events = {};
    },
    
    /**
     * Registriert einen Ereignis-Handler-Funktion zu einen bestimmten Ereignis, damit diese ausgeführt wird, wenn das 
     * Ereignis ausgelöst wird.
     * @param {String} eventName Der Name des Ereignisses, das abgehört werden soll.
     * @param {Function} handler Die Ereignis-Handler-Funktion, die ausgeführt werden soll.
     * @return {Function Die Ereignis-Handler-Funktion, um dessen späteres Entfernen zu erleichtern, wenn die Funktion
     * mit .bind(this) gekapselt wurde.
     * @memberof EventPublisher
    */
    addListener: function(eventName, handler, context) {
		handler = handler.bind(context);
		
		// Wenn zuvor noch kein Ereignis-Handler bei diesem Ereignis registriert worden ist.
        if (!this._events[eventName]) {
            this._events[eventName] = [];
        }
        
        // Fügt die Handler-Funktion ein
        this._events[eventName].push(handler);
        
        return handler;
    },

    /**
     * Entfernt einen bestimmten Ereignis-Handler von einemm bestimmten Ereignis
     * @param {String} eventName Das Ereignis, von welchem der Ereignis-Handler entfernt werden soll
     * @param {Function} handler Eine Referenz zur Handler-Funktion
     * @memberof EventPublisher
    */ 
    removeListener: function(name, handler) {
        if (this._events[name]) {
            this._events[name] = this._events[name].without(handler);
        }
    },
	
	removeListenersByEventName: function(name) {
		delete this._events[name];
	},
	
    /**
     * Entfernt alle Handler von allen Ereignissen (!).
     * @memberof EventPublisher
    */ 
    clearAllListeners: function() {
        this._events = {};
    },

    /**
    * Fires the event {eventName}, resulting in all registered handlers to be executed.
    * @param {String} eventName The name of the event to fire
    * @params {Object} args [optional] Any object, will be passed into the handler function as the only argument
    */
    fireEvent: function(eventName) {
        if (this._events[eventName]) {
			var args = $A(arguments);
			args.shift();
			
			return !this._events[eventName].any(function(handler) {
				try {
					if (handler.apply(this, args) === false) {
						return true;
					}
				} catch (e) {
					alert("Fehler in " + (this.id || "[unbekanntes Objekt]") + ".fireEvent():\n\n" +
						"Ereignis: " + eventName + "\n" +
						"Fehlertyp: " + e.name + "\n" +
						"Fehlermeldung: " + e.message + "\n" +
						"Datei: " + e.fileName + "\n" +
						"Zeile: " + e.lineNumber);
				}
			}, this);
        }
        
        return true;
    }
}).alias("addListener", "on").alias("removeListener", "un");

var Collection = Class.create(Hash, EventPublisher.prototype, {
	initialize: function($super, object) {
		$super(object);
		
		EventPublisher.prototype.initialize.call(this);
	},
	
	set: function(item) {
		this._object[item.id] = item;
		
		this.fireEvent("add", item);
		
		return item;
	},
	
	unset: function($super, value) {
		var key = (value.id) ? value.id : value;
		
		var item = this._object[key];
		delete this._object[key];
		
		this.fireEvent("remove", item);
		
		return item;
	},
	
	clear: function() {
		this._object = {};
		this.fireEvent("clear");
	},
	
    _each: function(iterator) {
		for (var key in this._object) {
			iterator(this._object[key]);
		}
	},
	
	index: Prototype.emptyFunction,
	update: Prototype.emptyFunction,
	inspect: Prototype.emptyFunction,
	toQueryString: Prototype.emptyFunction
}).alias("set", "add").alias("unset", "remove").alias("clear", "removeAll");

var ControlCollection = Class.create(Collection, {
	initialize: function($super, autoRemove) {
		$super();
		
		this._autoRemove = autoRemove || true;
	},
	
	set: function($super, control) {
		$super(control);
		
		if (this._autoRemove) {
			control.on("remove", this.unset.bind(this, control.id));
		}
	},
	
	clear: function($super) {
		if (this._autoRemove) {
			this.invoke("remove");
		}
		
		$super();
	}
}).alias("set", "add").alias("clear", "removeAll");

var WindowCollection = Class.create(ControlCollection, {
	hasWindowOfType: function(type) {
		return this.find(function(window) {
			return window.type === type;
		});
	},
	
	closeAllOfType: function(type) {
		this.findAll(function(window) {
			return window.type === type;
		}).invoke("close");
	},
	
	getNumberOfOpenWindows: function() {
        return this.findAll(function(window) {
			return !window.removed && window.visible();
        }).length;
	}
}).alias("clear", "closeAll");