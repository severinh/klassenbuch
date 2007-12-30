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
 * @fileOverview Hauptdatei des Klassenbuchs, welche die zentrale statische Klasse <a href="App.htm">App</a> enthält.
 * Auch wird in dieser Datei festgelegt, dass während der Kommunikation mit dem Server ein "Laden..."-Hinweis erscheint.
 * @author <a href="mailto:severinheiniger@gmail.com">Severin Heiniger</a>
*/

/**
 * Hauptobjekt des Klassenbuchs, das verschiedene Grundfunktionalitäten - z. B. eine Funktion zum Initialisieren des
 * Klassenbuchs - bereitstellt und den Einstiegspunkt für den Zugriff auf aktive Fenster, Menüpunkte usw. darstellt.
 * @event beforeInitialize - Wird ausgelöst, wenn alle benötigen Dateien geladen worden sind und mit der Initialisierung
 * des Klassenbuchs begonnen wird
 * @event initialize - Wird ausgelöst, wenn das Klassenbuch fertig initialisiert worden ist
*/
var App = Object.extend(/** @scope App */ {
	/**
	 * Initialisiert das Klassenbuch. Dabei wird überprüft, ob das Klassenbuch mit der verwendeten Browser-Version
	 * kompatibel ist und das Hauptmenü des Klassenbuchs eingerichtet. Zusätzlich werden die beiden Ereignisse
	 * <em>beforeInitialize</em> und <em>initialize</em> ausgelöst.
	*/
	initialize: function() {
		// Verhindert, dass das Klassenbuch mehrmals initialisiert werden kann und prüft die Kompatibilität
		if (!this.initialized && this.checkBrowserCompatibility()) {
			this.fireEvent("beforeInitialize");
			
			// Richtet das Hauptmenü ein.
			this.Menu = $("menu").insertControl(new Controls.Menu("aufgaben"), "top");
			
			this.fireEvent("initialize");
			
			var state = ["aufgaben"];
			
			if (this.History.browserSupported) {
				this.History.start("aufgaben");

				var bookmarked = this.History.getBookmarkedState();

				if (bookmarked) {
					state = bookmarked.split("/");
				}
			}

			this.Menu._handleStateChange(state);
		
			// Versteckt den Laden-Hinweis
			$("activeRequest").hide();
	
			this.initialized = true;
		}
	},
	
	/**
	 * Prüft, ob das Klassenbuch kompatibel mit dem Browser ist, mit dem es der Benutzer aufgerufen hat. Dazu wird
	 * zuerst eine Browser-Erkennung durchgeführt. Sollte keine Kompatibilität vorliegen, wird der Benutzer darauf
	 * hingewiesen.
	 * @returns {Boolean} Ob der Browser kompatibel ist oder nicht.
	*/
	checkBrowserCompatibility: function() {
		if (Prototype.Browser.supported) {
			var body = $$("body")[0];
			
			$w("Gecko Opera IE IE6 WebKit").each(function(a) {
				if (Prototype.Browser[a]) {
					body.addClassName(a.toLowerCase());
				}
			});
			
			return true;
		}
		
		// Lässt die Fehlermeldung erscheinen
		document.getElementById("browserNotSupported").style.display = "";
		
		return false;
	},
    
	/**
	 * Eine Auflistung aller existierenden Fenster, unabhängig davon, ob sie sichtbar sind oder nicht.
	 * @type WindowCollection
	*/
	Windows: new WindowCollection(),

	/**
	 * Das Hauptmenü des Klassenbuchs, das den Zugriff auf die verschiedenen Bereiche des Klassenbuchs ermöglicht.
	 * Jeder Menüpunkt ist in einer bestimmten Quelldatei definiert. Die Menüpunkte werden zudem aus ebendiesen Dateien
	 * dem Menü hinzugefügt.
	 * @type Controls.TabControl
	*/
	Menu: null,
	
	/**
	 * Gibt an, um welche Version des Klassenbuchs es sich handelt.
	 * @type String
	*/
	version: "2.8",
	
	/**
	 * Gibt an, ob das Klassenbuch bereits initialisiert worden ist. Standartwert ist <em>false</em>.
	 * @type Boolean
	*/
	initialized: false
}, Observable);

App.LoadingIndicator = function() {
	var active = true;
	
	var show = function() {
		if (active && Ajax.activeRequestCount !== 0) {
			$(document.body).setStyle({ cursor: "wait" });
			$("activeRequest").show();
		};
	};
	
	var hide = function() {
		if (Ajax.activeRequestCount === 0) {
			$(document.body).setStyle({ cursor: "default" });
			$("activeRequest").hide();
		}
	};
	
	// Bewirkt, dass der "Laden..."-Hinweis angezeigt wird, wenn eine Kommunikation mit dem Server stattfindet. Zusätzlich
	// wird die Form des Cursors entsprechend verändert.
	Ajax.Responders.register({
		onCreate: show,
		onComplete: hide
	});
	
	return {
		activate: function() {
			active = true;
		},
		
		deactivate: function() {
			active = false;
		}
	};
}();

var Sprite = Class.create({
	initialize: function(spriteName, index, className) {
		this.spriteName = spriteName;
		this.index = index || 0;
		this.className = className || "";
	},
	
	toHTML: function(additionalClassName, tag) {
		tag = tag || "div";
		
		var sprite = Sprite.List[this.spriteName];
		var position = ((this.index > 0) ? "-" : "") + (sprite.offset * this.index) + "px";
		
		return "<" + tag + " class=\"sprite sprite" + this.spriteName.capitalize() + " " + this.className + " " +
			(additionalClassName || "") + "\" style=\"background-position: " +
			((sprite.alignment === "horizontal") ? position + " 0px" : "0px " + position) + "\"></" + tag + ">";
	}
});

Sprite.List = {
	smallIcons: {
		offset: 16,
		alignment: "horizontal"
	},
	
	gradients: {
		offset: 40,
		alignment: "vertical"
	},
	
	fileTypesSmall: {
		offset: 16,
		alignment: "horizontal"
	}
};

/**
 * @class Stellt verschiedene Funktionen bereit, die den Vergleich zweier Werte ermöglichen. Diese Funktionen werden
 * genutzt, um Arrays mit bestimmten Wertetypen zu sortieren.
 * @static
*/
var Comparators = {
	/**
	 * @method Vergleicht zwei Fliesskommazahlen. Es erfolgt eine automatische Umwandlung der zwei Eingabewerte zum Typ¨
	 * <em>Float</em>.
	 * @param {Object} a Die erste Fliesskommazahl
	 * @param {Object} b Die zweite Fliesskommazahl
	 * @returns {Integer}
	*/
	numeric: function(a, b) {
		return parseFloat(a) - parseFloat(b);
	},
	
	/**
	 * @method Vergleicht zwei Zeichenfolgen.
	 * @param {String} a Die erste Zeichenfolge
	 * @param {String} b Die zweite Zeichenfolge
	 * @returns {Integer}
	*/
	string: function(a, b) {
		a = a.toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u");
		b = b.toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u");
		
		return (a === b) ? 0 : ((a === "") ? 1 : ((b === "") ? -1 : ((a > b) ? 1 : -1)));
	}
};

// Wenn der ganze HTML-Text und der JavaScript-Code vom Browser eingelesen wurde und das DOM bereit ist, wird das
// Klassenbuch initialisiert. Dadurch wird erreicht, dass nicht gewartet werden muss, bis alle Bilddateien usw. geladen
// worden sind.
if (!window.PREVENT_APP_FROM_STARTING) {
	document.observe("dom:loaded", function() {
		App.initialize();
	});
}
