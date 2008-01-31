/*
 * Klassenbuch
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
	 * to the result). Unlike Prototype's Object.clone this recursive function produces a deep copy rather 
	 * than a shallow copy.
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
		 * @param {Number} [roundTo] The number of decimal places to be returned. Defaults to 2.
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

/**
 * Returns a function that returns a certain objects: the object is wrapped. In case the passed object is a function
 * itself the function will return it untouched.
 * @param {Object} The object to wrap in a function.
 * @return {Function} The resulting function.
*/

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
	 * Checks if the string is a valid mail address.
	 * @returns {Boolean} Valid or not.
	* @example
"somebody@example.com".isValidMailAddress();
// -> true

"_somebody@example.c".isValidMailAddress();
// -> false
	*/
	isValidMailAddress: function() {
		var regExp = /^[a-zA-Z0-9]+[_a-zA-Z0-9-]*(\.[_a-z0-9-]+)*@[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9-]+)*(\.[a-z]{2,4})$/;
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
		
		var result = this.strip().toLowerCase().replace(/\s/g, "-").replace(/[^A-Z0-9-]/gi, "");
		
		arguments.callee._STORE[this] = result;
		
		return result;
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
 * BBCode is used for safe text formatting instead of HTML tags. This namespace contains a function to transform BBCode
 * into HTML text.
 * @namespace
*/
var BBCode = {
	/**
	 * Parses a string that contains BBCode tags and transforms it into HTML text. Allowed BBCode tags are [B]xyz[/B],
	 * [I]xyz[/I], [U]xyz[/U], [URL=http://xyz.com/]Link to xyz[/URL], [URL]http://xyz.com/[/URL], [COLOR=xyz]abc[/COLOR], 
	 * [QUOTE]xyz[/QUOTE] and [BR /].
	 * @param {String} value The text to parse.
	 * @return {String} The transformed text containing html tags.
	*/
	parse: function(value) {
		if (value.include("[")) { // Performance optimization: Don't do the whole parsing thing if there isn't a BBCode tag.
			// Three helper functions to avoid redundant code.
			var replace = function(re, str) {
				value = value.replace(re, str);
				return value;
			};
			
			var replaceLazy = function(re, str, check) {
				if (value.include(check)) {
					return replace(re, str);
				}
			};
			
			var replacePair = function(re1, re2, str1, str2, match) {
				if (!replaceLazy(re1, str1, match)) {
					return false;
				};
				
				replace(re2, str2);
			};
			
			replace(/\[BR \/\]/g, "<br />");
			
			replacePair(/\[B\]/g, /\[\/B\]/g, "<strong>", "</strong>", "[B]");
			replacePair(/\[I\]/g, /\[\/I\]/g, "<em>", "</em>", "[I]");
			replacePair(/\[U\]/g, /\[\/U\]/g, "<u>", "</u>", "[U]");
			
			replaceLazy(/\[URL=([^\]]+)\](.*?)\[\/URL\]/g, "<a href=\"$1\">$2</a>", "[URL=");
			replaceLazy(/\[URL\](.*?)\[\/URL\]/g, "<a href=\"$1\">$1</a>", "[URL]");
			
			// The font tag was intentionally chosen due to possible CSS hacks in a style attribute.
			replaceLazy(/\[COLOR=(.*?)\](.*?)\[\/COLOR\]/g, "<font color=\"$1\">$2</font>", "[COLOR=");
			replaceLazy(/\[QUOTE.*?\](.*?)\[\/QUOTE\]/g, "<blockquote>$1</blockquote>", "[QUOTE");
		}
		
		return value;
	}
};

/**
 * This namespace contains a list of emoticons and a function to replace any supported emoticon in a string with its
 * corresponding <img> tag.
 * @namespace
*/
var Emoticons = function() {
	var emoticons = $H({
		angry:    ["*angry*"],
		biggrin:  [":-D", ":D"],
		blink:    ["o.O", "oO"],
		blush:    ["*blush*", ":-*)"],
		cool:     ["B-)", "B)", "8-D", "8D"],
		dry:      ["-.-"],
		excl:     ["*excl*"],
		happy:    ["^^"],
		huh:      ["*huh*"],
		laugh:    ["lol"],
		lol:      ["xD", "XD"],
		mellow:   ["*mellow*", ":-|"],
		ohmy:     [":-o"],
		rolleyes: ["*rolleyes*"],
		sad:      [":-(", ":("],
		sleep:    ["-_-"],
		smile:    [":-)", ":)"],
		tongue:   [":-P", ":P"],
		unsure:   ["*unsure*", ":-/"],
		wink:     [";-)", ";)"]
	});
	
	// Internally used to connect certain emoticons to their corresponding image file in the directory images/emoticons.
	var reversedMap = {};
	
	emoticons.each(function(pair) {
		pair.value.each(function(emo) {
			reversedMap[emo] = pair.key;
		});
	});
	
	return /** @scope Emoticons */ {
		/**
		 * Replaces any supported emoticons with its corresponding <img> tag.
		 * @param {String} value The text to parse.
		 * @return {String} The transformed text containing html tags.
		*/
		parse: function(value) {
			return value.replace(/(\*(angry|blush|excl|huh|mellow|rolleyes|unsure)\*|:-?[D\(\)P]|o\.?O|B-?\)|8-?D|-[._]-|:-(\||o|\/|\*\))|;-?\)|\^\^|lol|[xX]D|=\()/g, function(emoticon) {
				return "<img src=\"images/emoticons/" + reversedMap[emoticon] +
					".gif\" class=\"unselectable\" style=\"vertical-align: middle;\" />"
			});
		},
		
		/**
		 * A list of emoticon image filenames that are supported by the parse function. Almost every image file is
		 * represented by two or more different emoticons.
		 * @type Hash
		*/
		Map: emoticons
	}
}();

/**
 * Provides methods to dynamically create and remove cookies.
 * @namespace
*/
var Cookie = {
	/**
	 * Returns the value of a certain cookie.
	 * @param {String} name The name of the cookie to read.
	 * @return {String} The cookie's value. Returns false if the cookie doesn't exist.
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
 * Provides various methods to get the browser window's inner dimensions (so called viewport), which can be used to center elements on
 * screen or to cover the whole screen with a single element. This definition overrides the original Prototype definition to improve
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
		 * @return {Object} The viewport's dimensions.
		 * @example
document.viewport.getDimensions();
// -> { width: 1280, height: 725 }
		*/
		getDimensions: function() {
			return { width: get("Width"), height: get("Height") };
		},

		/**
		 * Returns the viewport's width in pixels.
		 * @return {Object} The viewport's width.
		 * @example
document.viewport.getWidth();
// -> 1280
		*/
		getWidth: function() {
			return get("Width");
		},

		/**
		 * Returns the viewport's height in pixels.
		 * @return {Object} The viewport's height.
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
	var version,
		B = Prototype.Browser,
		ua = navigator.userAgent.toLowerCase();
	
	// Browser version detection (only applies to IE and Opera)
	switch (true) {
		case B.IE:    version = (!Object.isNull(/msie ([0-9]{1,}[\.0-9]{0,})/.exec(ua))) ? parseFloat(RegExp.$1) : 3; break;
		case B.Opera: version = (window.opera.version) ? parseFloat(window.opera.version()) : 7.5;
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
		 * Indicates whether good ol' Internet Explorer 6 is used to access the application. Perish the thought this property might ever
		 * be <em>true</em>.
		 * @type Boolean
		*/
		IE6: (B.IE && version === 6),
		
		/**
		 * Indicates whether the used browser should be able to run the application smoothly. Currently Firefox versions older than 1.5
		 * and IE versions older than 6 aren't supported.
		 * @todo Should be moved to a more reasonable place.
		 * @type Boolean
		*/
		supported: !(B.IE && version < 6)
	};
})());

// Based on a code snippet posted in the Prototype developer mailinglist.
(function() {
	// Used for time unit conversion
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
	
	// Pluralized time unit such as "days" may be used as well.
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
	Object.extend(Date.prototype, /** @scope Date.prototype */ {
		/**
		 * Makes it possible to iterate through date ranges using $R. One iteration step spans one day.
		 * @return {Date} The next day.
		 * @example
$R(new Date(), new Date().add(3, "days")).invoke("format", "d.m.Y").join(", ");
// -> "08.12.2007, 09.12.2007, 10.12.2007, 11.12.2007"
		*/
		succ: function() {
			return new Date(this.getTime() + multipliers.get("day"));
		},
		
		/**
		 * Adds a specific amount of time to the date object. In addition to the numerical amount of time a textual
		 * time unit can be specified that can be both singular and plural. Even negative values are allowed.
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
		
		/**
		 * Calculates the difference between to dates.
		 * @param {Date} date The date to compare with.
		 * @param {String} [unit] The time unit to use on returning the difference. Defaults to "day".
		 * @param {Number} [allowDecimal] If the result may contain decimal places of not. Defaults to false.
		 * @return {Number} The calculated time difference.
		*/
		diff: function(date, unit, allowDecimal) {
			var ms = this.getTime() - date.getTime();
			var unitDiff = ms / multipliers.get(unit || "day");
			
			return allowDecimal ? unitDiff : Math.floor(unitDiff);
		},
		
		/**
		 * Formats the date. Returns a string formatted according to the given format string. The format syntax is based
		 * on PHP's date() function. Escape sequences aren't supported, so it will be inevitable to split up the format
		 * process in some cases.
		 * The implementation approach is based on http://www.codeproject.com/jscript/dateformat.asp.
		 * @param {String} [format] The format of the outputted date string. Refer to
		 * http://ch2.php.net/manual/de/function.date.php for a list of keywords.
		 * @return {String} The formatted string.
		*/
		format: function(format) {
			// Avoid redundancy
			var self = this,
				hours = this.getHours(),
				a = (hours < 12) ? "am" : "pm",
				g = (hours >= 12) ? hours - 12 : hours,
				G = hours,
				j = this.getDate(),
				n = this.getMonth() + 1;
			
			return format.replace(/[aAdDFgGhHijmnMsY]/g, function(key) {
				switch (key) {
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
		
		/**
		 * Returns the date's Unix time.
		 * @return {Number} The timestamp.
		*/
		getTimestamp: function() {
			return Math.round(this.getTime() / 1000);
		},
		
		/**
		 * Sets the date using the Unix time.
		 * @param {Number} timestamp The timestamp.
		 * @return {Date} The date object. Can be used for chaining purposes.
		*/
		setTimestamp: function(timestamp) {
			this.setTime(timestamp * 1000);
			
			return this;
		},
		
		/**
		 * Indicates if two dates are exactly equal.
		 * @param {Date} date The Date object to compare with.
		 * @return {Boolean} Whether the two dates are equal.
		*/
		equals: function(date) {
			return this.getTime() === date.getTime();
		},
		
		/**
		 * Indicates if the date is today.
		 * @return {Boolean} Dito.
		 * @function
		*/
		isToday: compare.curry(0),
		
		/**
		 * Indicates if the date was yesterday.
		 * @return {Boolean} Dito.
		 * @function
		*/
		wasYesterday: compare.curry(-1),
		
		/**
		 * Indicates if the date will be tomorrow.
		 * @return {Boolean} Dito.
		 * @function
		*/
		willBeTomorrow: compare.curry(1),
		
		/**
		 * Removes any time informations (hours, minutes, seconds, milliseconds) from the Date object.
		 * This method's implementation is based on the Ext framework (refer to http://www.extjs.com/).
		 * @param {Boolean} clone If true, the method isn't desctructive and clones the Date object before
		 * removing any information. Defaults to false.
		 * @return {Date} The resulting Date object. Either cloned or not.
		*/
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
		
		/**
		 * Clones the Date object as the method name says.
		 * @return {Date} The new Date object which holds the same date as the original one.
		*/
		clone: function() {
			return new Date(this.getTime());
		}
	});
	
	Object.extend(Date, /** @scope Date */ {
		/**
		 * Returns the current Unix time.
		 * @return {Number} The timestamp.
		*/
		getCurrentTimestamp: function() {
			return new Date().getTimestamp();
		},
		
		/**
		 * Returns the todays Unix time.
		 * @return {Number} The timestamp.
		*/
		getTodaysTimestamp: function() {
			return new Date().removeTime().getTimestamp();
		},
		
		/**
		 * Returns a Date object based on a Unix timestamp.
		 * @param {Number} timestamp The timestamp to use.
		 * @return {Date} The new Date object.
		*/
		fromTimestamp: function(timestamp) {
			return new Date(timestamp * 1000);
		},
		
		/**
		 * A list of weekdays, beginning with Sunday.
		 * @type {String[]}
		*/
		weekdays: $w("Sonntag Montag Dienstag Mittwoch Donnerstag Freitag Samstag"),
		
		/**
		 * A list of shortened weekdays, beginning with Sunday.
		 * @type {String[]}
		*/
		weekdaysAbbr: $w("So Mo Di Mi Do Fr Sa"),
		
		/**
		 * A list of the number of days in each month, beginning with January.
		 * @type {Number[]}
		*/
		daysPerMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
		
		/**
		 * A list of month names, beginning with January.
		 * @type {String[]}
		*/
		months: $w("Januar Februar März April Mai Juni Juli August September Oktober November Dezember")
	});
})();

PeriodicalExecuter.addMethods(/** @scope PeriodicalExecuter.prototype */ {
	/**
	 * Initiates the periodical exection timer if it hasn't been done yet.
	*/
	enable: function() {
		if (!this.timer) {
			this.registerCallback();
		}
	},
	
	/**
	 * Sets the execution frequency. In case the timer was already ticking it will be resetted.
	 * @param {Number} frequency The new frequency in seconds.
	*/
	setFrequency: function(frequency) {
		if (frequency !== this.frequency) { // We do the whole thing only in case the frequency has changed.
			this.frequency = frequency;
			
			if (this.timer) {
				this.disable();
				this.enable();
			}
		}
	},
	
	/**
	 * An alias for the method "stop".
	 * @function
	*/
	disable: PeriodicalExecuter.prototype.stop
});

Element.addMethods(/** @scope Element.Methods */ {
	/**
	 * Removes any content from an element.
	 * @param {Element} element The element.
	 * @return {Element} The element. Allows chaining of element methods.
	*/
	clear: function(element) {
		element.innerHTML = "";
		return element;
	},
	
	/**
	 * Either shows or hides the element.
	 * @param {Element} element The element.
	 * @param {Boolean} visibility The new visibility value. Defaults to false so that the element would be hidden.
	 * @return {Element} The element. Allows chaining of element methods.
	*/
	setVisibility: function(element, visibility) {
		element = $(element);
		element[visibility ? "show" : "hide"]();
		return element;
	},
	
	/**
	 * Makes a <div> element scroll to the absolute bottom of its content. This method is based on an entry in
	 * Eric's weblog at http://radio.javaranch.com/pascarello/2005/12/14/1134573598403.html
	 * @param {Element} element The element.
	 * @return {Element} The element. Allows chaining of element methods.
	*/
	scrollToBottom: function(element) {
		element.scrollTop = element.scrollHeight;
		return element;
	},
	
	/**
	 * Analogue to the scrollToBottom method: This method lets a <div> element scroll to the top.
	 * @param {Element} element The element.
	 * @return {Element} The element. Allows chaining of element methods.
	*/
	scrollToTop: function(element) {
		element.scrollTop = "0px";
		return element;
	},
	
	/**
	 * Places an element on the center of the browsers viewport based on its size and the one of the viewport.
	 * This method invokes both the element's centerVertically and centerHorizontally method.
	 * @param {Element} element The element.
	 * @return {Element} The element. Allows chaining of element methods.
	*/
	centerOnScreen: function(element) {
		element = $(element);
		return element.centerVertically().centerHorizontally();
	},

	/**
	 * Places an element on the vertical center of the browsers viewport based on its height and the one of the
	 * viewport. The method won't position the element outside the upper window border.
	 * @param {Element} element The element.
	 * @return {Element} The element. Allows chaining of element methods.
	*/
	centerVertically: function(element) {
		var windowHeight = document.viewport.getHeight();
		var top = (windowHeight - parseInt(element.getStyle("height"), 10)) / 2;

		return element.setStyle({ top: top.limitTo(0, windowHeight) + "px" });
	},
	
	/**
	 * Places an element on the horizontal center of the browsers viewport based on its width and the one of the
	 * viewport. The method won't position the element outside the left window border.
	 * @param {Element} element The element.
	 * @return {Element} The element. Allows chaining of element methods.
	*/
	centerHorizontally: function(element) {
		var windowWidth = document.viewport.getWidth();
		var left = (windowWidth - parseInt(element.getStyle("width"), 10)) / 2;
		
		return element.setStyle({ left: left.limitTo(0, windowWidth) + "px" });
	},
	
	/**
	 * Creates a new child node based on attributes, style informations etc. By default a <div> element is
	 * created.
	 * @param {Element} element The "parent" element.
	 * @param {Object} [options] Various options that are to be applied to the new node.
	 * The new element's tag name can be chosen using the "tag" property. This defaults to "div".
	 * The new element's content can be set using the "content" property.
	 * The new elemnts's style information can be set using the "style" property.
	 * @param {String} [position] The position of the new element. Valid values are "before", "top",
	 * "bottom", "after". Defaults to "bottom".
	 * @return {Element} The created node. Please keep in mind: This breaks the chaining of the Prototype
	 * framework.
	*/
	createChild: function(element, options, position) {
		options = options || {};
		
		// Extract "magic" values...
		var content = options.content,
			style = options.style,
			tag = options.tag,
			insertion = {};
		
		// ...then remove them from their original place...
		delete options["content"];
		delete options["style"];
		delete options["tag"];
		
		// ...a proper attributes object.
		var child = new Element(tag || "div", options);

		// Set the content if needed.
		if (content) {
			child.innerHTML = content;
		}

		// Set the style if needed.
		if (style) {
			child.setStyle(style);
		}

		insertion[position || "bottom"] = child;

		$(element).insert(insertion);

		return child;
	},
    
	/**
	 * Places the element of a Control object in the DOM tree.
	 * @param {Element} element The "parent" element.
	 * @param {Control} control The control that hasn't been added to the document yet.
	 * @param {String} [position] The position of the new element. Valid values are "before", "top",
	 * "bottom", "after". Defaults to "bottom".
	 * @return {Control} The Control object for chaining purposes.
	*/
	insertControl: function(element, control, position) {
		var insertion = {};

		position = position || "bottom";
		insertion[position] = control.element;

		$(element).insert(insertion);

		control.fireEvent("insert");

		return control;
	}
});

/**
 * Creates an alias of a certain method of a class created with the Class.create function.
 * @param {String} source The method name to create an alias from.
 * @param {String} destination The new method name.
 * @return {Function} The class for chaining purposes.
*/
Class.Methods.alias = function(source, destination) {
	this.prototype[destination] = this.prototype[source];
	
	return this;
};

/**
 * An abstract mixin that provides the possibility to fire and observe events. It's based on the
 * EventPublisher class of Ryan Dahl.
 * Refer to http://www.someelement.com/2007/03/eventpublisher-custom-events-la-pubsub.html.
 * @mixin
*/
var Observable = {
	/* * @return {Function Die Ereignis-Handler-Funktion, um dessen späteres Entfernen zu erleichtern, wenn die Funktion
	 * mit .bind(this) gekapselt wurde.
	*/
	
	/**
	 * Connects a event handler function to a certain event so that it is executed as soon as the event is fired.
	 * @param {String} eventName The event to observe.
	 * @param {Function} handler The event handler.
	 * @param {Object} [context] The event handler can be bound to a certain context.
	 * @return {Function} The event handler. This makes it possible to easily remove the event handler at any time.
	*/
	addListener: function(eventName, handler, context) {
		// Inizialize the Observable object if this hasn't happened yet.
		if (Object.isUndefined(this._events)) {
			this._events = {};
		}
		
		handler = handler.bind(context);
		
		// In case no event handlers have been observing this event before.
		if (!this._events[eventName]) {
			this._events[eventName] = [];
		}

		// Add the event handler function.
		this._events[eventName].push(handler);

		return handler;
	},

	/**
	 * Entfernt einen bestimmten Ereignis-Handler von einemm bestimmten Ereignis
	 * @param {String} eventName Das Ereignis, von welchem der Ereignis-Handler entfernt werden soll
	 * @param {Function} handler Eine Referenz zur Handler-Funktion
	*/
	
	/**
	 * Removes a certain event handler.
	 * @param {Object} eventName The event name.
	 * @param {Object} handler The event handler function to remove.
	 */
	removeListener: function(eventName, handler) {
		// Inizialize the Observable object if this hasn't happened yet.
		if (Object.isUndefined(this._events)) {
			this._events = {};
		}
	
		if (this._events[eventName]) { // Check if there are event handlers at all
			this._events[eventName] = this._events[eventName].without(handler);
		}
	},
	
	/**
	 * Removes any event handlers from a certain event.
	 * @param {Object} name The event name.
	*/
	removeListenersByEventName: function(name) {
		// Inizialize the Observable object if this hasn't happened yet.
		if (Object.isUndefined(this._events)) {
			this._events = {};
		}
		
		delete this._events[name];
	},

	/**
	 * Removes all event handlers. (!)
	*/
	clearAllListeners: function() {
		this._events = {};
	},

	/**
	 * Fires the event by executing all registered handlers connected with this event.
	 * @param {String} eventName The name of the event to fire.
	 * @param {Object} [args] Any object(s). Will be passed to the handler functions.
	 * @return {Boolean} Returns true if the event handlers were successfully executed and none of them returned.
	 * false to stop the event. Otherwise false.
	*/
	fireEvent: function(eventName) {
		// Inizialize the Observable object if this hasn't happened yet.
		if (Object.isUndefined(this._events)) {
			this._events = {};
		}
		
		if (this._events[eventName]) { // Checks if there are any event handlers
			// Extract event arguments.
			var args = $A(arguments);
			args.shift();

			// Iterate through the event handlers until one of them returns "false"
			return !this._events[eventName].any(function(handler) {
				try {
					if (handler.apply(this, args) === false) {
						return true;
					}
				} catch (e) {
					// Oouch.
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
};

Object.extend(Observable, {
	on: Observable.addListener,
	un: Observable.removeListener
});

var Collection = Class.create(Enumerable, {
	initialize: function() {
		this._object = {};
	},
	
	_each: function(iterator) {
		for (var key in this._object) {
			iterator(this._object[key]);
		}
	},
	
	set: function(item) {
		this._object[item.id] = item;
		
		this.fireEvent("add", item);
		
		return item;
	},
	
	get: function(id) {
		return this._object[id];
	},
	
	unset: function(value) {
		var id = value.id || value,
			item = this._object[id];
		
		delete this._object[id];
		
		this.fireEvent("remove", item);
		
		return item;
	},
	
	clear: function() {
		this._object = {};
		this.fireEvent("clear");
	},
	
	keys: function() {
		return this.pluck("id");
	}
}).alias("set", "add").alias("unset", "remove").alias("clear", "removeAll").addMethods(Observable);

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
		return !!this.find(function(window) {
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
			return window.element && window.visible();
		}).length;
	}
}).alias("clear", "closeAll");
