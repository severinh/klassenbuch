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
 * @class Die Basisklasse für etliche Steuerelemente wie <em>Controls.Table</em> und <em>Controls.Button</em>.<br /><br />
 * Sie stellt zahlreiche Wrapper-Methoden wie <em>show</em> und <em>setStyle</em> bereit, mit denen das Steuerelement
 * bequem versteckt, umgestaltet usw. werden kann und teilweise auch entsprechende Ereignisse auslösen, die dann abgehört
 * werden können. Das Steuerelement wird durch Übergabe des DOM-Elements, das in ein Steuerelement verwandelt werden soll,
 * initialisiert.
 * @param {HTMLObject|String} element Das HTML-Element bzw. seine ID, dass als Steuerelements fungieren soll.
 * @event show - Wird ausgelöst, wenn das Steuerelement sichtbar gemacht wird
 * @event hide - Wird ausgelöst, wenn das Steuerelement unsichtbar gemacht wird
 * @event remove - Wird ausgelöst, wenn das Steuerelement entfernt wird
 */
var Control = Class.create({
	initialize: function(element) {
		/**
		 * @field {ExtendedHTMLObject} Das HTML-Element des Steuerelements.
		*/
		this.element = $(element);
		
		/**
		 * @field {String} Die ID des Steuerelements. Wird von Prototype generiert.
		*/
		this.id = this.element.identify();
		
		this._childControls = [];
		this._shortcuts = {};
	},
	
	/**
	 * @method Hilfsfunktion, mit der dem <em>options</em>-Feld weitere Einstellungen hinzugefügt werden können.
	 * Einerseits können an diese Methode Standardwerte für bestimmte Optionen übergeben werden. Diese Standardwerte
	 * werden dann mit den Daten aus dem zweiten Parameter überschrieben, sofern die definiert sind. Die anderen
	 * Einstellungen, die sich vor Aufruf dieser Methode bereits im Feld <em>options</em> befinden, bleiben erhalten.
	 * <br /><br />Beispielsweise: <em>myControl.setOptions({ foo: "Hello", bar: true }, { bar: false });</em><br />
	 * <br />Im Feld <em>options</em> des Steuerelements werden sich dann (unter anderem) die folgenden Werte
	 * befinden:<br /><ul><li>foo: "Hello"</li><li>bar: false</li></ul>.
	 * @param {Object|null} standardValues Die zu verwendenden Standardwerte.
	 * @param {Object|null} options Die eigentlichen Einstellungen.
	*/
	setOptions: function(standardValues, options) {
		this.options = Object.extend(this.options || {}, Object.extend(standardValues || {}, options || {}));
	},
	
	registerChildControl: function() {
		$A(arguments).each(function(control) {
			this._childControls.push(control);
		}, this);
	},
	
	_onExternalEvent: function(evtPubInst, eventName, handler, scope) {
		evtPubInst.on(eventName, handler, scope);
		
		this.on("remove", function() {
			evtPubInst.un(eventName, handler);
		});
		
		return handler;
	},
	
	registerShortcut: function(keys, handler, scope) {
		$A(keys).each(function(key) {
			if (Object.isNumber(key)) {
				this._shortcuts[key] = handler.bind(scope);
			}
		}, this);
	},
	
	enableShortcuts: function() {
		if (!this._shortCutObserver) {
			this._shortCutObserver = (function(event) {
				if (this._shortcutsEnabled) {
					var handler = this._shortcuts[event.keyCode];
					
					if (handler) {
						handler();
					}
				}
			}).bindAsEventListener(this);
			
			document.observe("keydown", this._shortCutObserver);
		}
		
		this._shortcutsEnabled = true;
	},
	
	disableShortcuts: function() {
		this._shortcutsEnabled = false;
	},
	
	makePropertiesFromClassNames: function() {
        $A(arguments).each(function(className) {
			this[className] = this.select("." + className)[0];
		}, this);
	},
	
	/**
     * @method Macht das Steuerelement unsichtbar, wenn es sichtbar ist und löst das Ereignis <em>hide</em> aus
     * (Wrapperfunktion).
    */
	hide: function() {
		if (this.visible() && this.fireEvent("beforehide")) {
			this.element.hide();
			this.fireEvent("hide");
		}
	},
	
	/**
     * @method Macht das Steuerelement wieder sichtbar, wenn es unsichtbar ist und löst das Ereignis <em>show</em> aus
     * (Wrapperfunktion).
    */
	show: function() {
		if (!this.visible() && this.fireEvent("beforeshow")) {
			this.element.show();
			this.fireEvent("show");
		}
	},
	
	/**
     * @method Entfernt das Steuerelement aus dem Dokument, wenn dies nicht bereits geschehen ist und löst das Ereignis
     * <em>remove</em> aus (Wrapperfunktion).
    */
	remove: function() {
        if (this.element && this.fireEvent("beforeremove")) {
			this._childControls.invoke("remove");
			
			if (this._shortCutObserver) {
				document.stopObserving("keydown", this._shortCutObserver);
			}
			
			this.element.stopObserving();
			
			if (this.element.parentNode) {
				this.element.remove();
            }
            
            // todo: muss weg
            this.removed = true;
            this.fireEvent("remove");
            this.clearAllListeners();
            
            return true;
        } else {
			return false;
        }
	},
	
	/**
     * @method Zeigt das Steuerelement an, wenn es zur Zeit unsichtbar ist und umgekehrt (Wrapperfunktion).
	*/
	toggle: function() {
		this[(this.visible()) ? "hide" : "show"]();
	}
}).addMethods(Observable);

$w("setStyle addClassName removeClassName toggleClassName centerOnScreen").each(function(a) {
	Control.prototype[a] = function(val) {
		this.element[a](val);
		return this;
	};
});

$w("select hasClassName getStyle getClassNames getHeight getWidth visible getDimensions").each(function(a) {
	Control.prototype[a] = function(val) {
		return this.element[a](val);
	};
});

var Controls = {};