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
 * @class Ermöglicht es, eine grafische Schaltfläche zu generieren, die aktiviert bzw. deaktivert werden kann,
 * auf Aktionen des Benutzers reagiert (Darüberfahren mit dem Mauszeiger) und zudem wahlweise über ein Symbol, einen
 * Text oder beides als Inhalt haben kann.
 * @extends Control
 * @param {String} caption Der Schaltflächentext
 * @param {Function} action Die Funktion, die aufgerufen werden soll, wenn der Benutzer auf die Schaltfläche klickt
 * @param {Object} options Verschiedene optionale Einstellungen
 * @event enable - Wird ausgelöst, wenn die Schaltfläche aktiviert (anklickbar gemacht) wird
 * @event disable - Wird ausgelöst, wenn die Schaltfläche deaktiviert wird
*/
Controls.Button = Class.create(Control, {
	initialize: function($super, caption, action, options) {
		// Überschreibt die mit options übergebenen Einstellungen mit den Standardwerten
		this.setOptions({
			enabled: true,
			onlySignedIn: false,
			className: "",
			buttonClass: "standardButton",
			tag: "span",
			visible: true
		}, options);
		
        $super(new Element(this.options.tag, {
			className: "button unselectable " + this.options.className,
			title: this.options.title || ""
		}));
        
        this.action = action || Prototype.emptyFunction;
		
		this.element.innerHTML = "<span class=\"leftBoundary\">&nbsp;</span><span class=\"rightBoundary\">" + 
			"<span class=\"content\"></span></span>";
		
		var spans = this.select("span");
		
		this.leftBoundary = spans[0];
		this.rightBoundary = spans[1];
		this.content = spans[2];
		
		this.setButtonClass(this.options.buttonClass);
		this.setCaption(caption);
		
		this.on("click", action);
		
		$w("over down out up").each(function(a) {
			this.element.observe("mouse" + a, this._setState.bind(this, a));
		}, this);
		
		if (this.options.onlySignedIn) {
			this._onExternalEvent(User, "signIn", this.enable, this);
			this._onExternalEvent(User, "signOut", this.disable, this);
		}
		
		this._updateContent();
		this.enable();
		
		if (!this.options.enabled || (this.options.onlySignedIn && !User.signedIn)) {
			this.disable();
		}
		
		if (!this.options.visible) {
			this.hide();
		}
	},

    /**
     * @method Legt den Schaltflächentext fest.
     * @param {String} caption Der neue Schaltflächentext
    */
	setCaption: function(caption) {
        /**
         * @field {String} Der Schaltflächentext. Standardwert ist <em>""</em>.
         * @private
        */
        this._caption = caption || "";
        this._updateContent();
    },
    
    setIcon: function(icon, iconDisabled) {
		this.options.icon = icon;
		
		if (iconDisabled) {
			this.options.iconDisabled = iconDisabled;
		}
		
		this._updateContent();
    },
    
    /**
     * @method Gibt den Schaltflächentext zurück.
     * @param {String} Der Schaltflächentext
    */	
	getCaption: function() {
		return this._caption;
	},
	
    /**
     * @method Aktualisiert den Inhalt der Schaltfläche. Dies wird beispielsweise nötig, wenn sich beim Deaktivieren
     * der Schaltfläche das Symbol ändern soll.
     * @private
    */
	_updateContent: function() {
		var caption = this.getCaption();
		
		if (this.options.icon) {
			var icon = this.options.icon;
			
			if (this.options.iconDisabled && !this.enabled) {
				icon = this.options.iconDisabled;
			}
			
			this.content.innerHTML = icon.toHTML((caption) ? "icon" : "icon withoutCaption", "span") + caption;
		} else {
            this.content.innerHTML = caption;
        }
	},
	
	setButtonClass: function(buttonClass) {
        if (this.buttonClass) {
            this.removeClassName(this.buttonClass);
        }
        
        this.addClassName(buttonClass);
        this.buttonClass = buttonClass;
	},
	
	_setState: function(state) {
		var position = {
			out: 0,
			enabled: 0,
			over: -100,
			up: -100,
			down: -200,
			disabled: -300
		}[state];
		
		if (this.enabled && Object.isDefined(position)) {
			this.leftBoundary.setStyle({ backgroundPosition: "0px " + position + "px" });
			this.rightBoundary.setStyle({ backgroundPosition: "100% " + position + "px" });
		}
	},
	
    /**
     * @method Aktiviert die Schaltfläche, sofern dies nicht schon der Fall ist. Die Schaltfläche ist nun wieder
     * anklickbar und reagiert auf Mausaktionen des Benutzers. Diese Methode löst das Ereignis <em>enabled</em> aus.
    */
	enable: function() {
		if (!this.enabled) {
			this.enabled = true;
			this._setState("enabled");
			
			this.removeClassName("disabled" + this.options.buttonClass.capitalize());
			this.element.observe("click", this.fireEvent.bind(this, "click"));
			
			// Wenn bei deaktivierter Schaltfläche ein besonderes Symbol angezeigt werden soll
			if (this.options.iconDisabled) {
				this._updateContent();
			}
			
			this.fireEvent("enable");
		}
	},

    /**
     * @method Deaktiviert die Schaltfläche, sofern dies nicht schon der Fall ist. Die Schaltfläche ist nun nicht mehr
     * anklickbar und reagiert nicht mehr auf Mausaktionen des Benutzers. Diese Methode löst das Ereignis
     * <em>disabled</em> aus.
    */
	disable: function() {
		if (this.enabled) {
            this._setState("disabled");
            this.enabled = false;
            
            this.addClassName("disabled" + this.options.buttonClass.capitalize());
			this.element.stopObserving("click");
			
			// Wenn bei deaktivierter Schaltfläche ein besonderes Symbol angezeigt werden soll
			if (this.options.iconDisabled) {
				this._updateContent();
			}
			
			this.fireEvent("disable");
		}
	}
});