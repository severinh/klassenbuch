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
		*/
		limitTo: function(a, b) {
			return (this < a) ? a : ((this > b) ? b : this);
		},
		
		/**
		 * Adds the appropriate file size unit to number representing a data size.
		 * @param {Number} [roundTo] The number of decimal places to be returned.
		 * @returns {String} The resulting data size string.
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
	 * 
	 * @param
	 * @param
	 * @returns
	*/
	replaceAll: function(a, b) {
		if (a === "") {
			return this;
		}
		
        return this.split(a).join(b);
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
	 * Turns the string into a more URL-friendly version that has no whitespaces and German umlauts. This method uses an
	 * internal cache that causes a significant performance improvment when addressifying a string two or more times.
	 * @returns {String} The addressified string.
	 * @example
"A string with a German umlaut: ö".addressify();
// -> "a-string-with-a-german-umlaut-oe"
	*/
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
	
	/**
	 * 
	 * @returns
	*/
	toDate: function() {
		return $D(this);
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

/** @ignore This is an internal cache used by String#addressify */
String.prototype.addressify._STORE = {};

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
 * @namespace
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
		 * Indicates whether the used browser should be able to run the application smoothly. Currently 
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