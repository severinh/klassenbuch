/*
 * Klassenbuch
 * Copyright (C) 2006 - 2007 Severin Heiniger
 * 
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
 * @extends EventPublisher
 * @param {HTMLObject|String} element Das HTML-Element bzw. seine ID, dass als Steuerelements fungieren soll.
 * @event show - Wird ausgelöst, wenn das Steuerelement sichtbar gemacht wird
 * @event hide - Wird ausgelöst, wenn das Steuerelement unsichtbar gemacht wird
 * @event remove - Wird ausgelöst, wenn das Steuerelement entfernt wird
 */
var Control = Class.create(EventPublisher, {
	initialize: function($super, element) {
        $super();
        
        /**
		 * @field {ExtendedHTMLObject} Das HTML-Element des Steuerelements.
		*/
		this.element = $(element);
		
        /**
		* @field {String} Die ID des Steuerelements. Wird von Prototype generiert.
        */
		this.id = this.element.identify();
		
		this._childControls = [];
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
});

$w("setStyle addClassName removeClassName toggleClassName").each(function(a) {
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

/**
 * @class Ein Steuerelement, dessen Grösse in Abhängigkeit zu derjenigen des Browserfensters verändert wird.
 * @param {HTMLObject|String} element Das HTML-Element oder seine ID, aus welchem das Steuerelement erstellt werden soll.
 * @param {Object} resizeMargin Enthält Informationen darüber, wie die Grössenanpassung erfolden soll.<br /><br />
 * Hat die Eigenschaft <em>height</em> beispielsweise einen Wert, wird die Höhe des Steuerelements aus der Differenz
 * dieses Wertes und der Fensterhöhe errechnet. Wurde die Eigenschaft <em>height</em> nicht definiert, erfolgt in
 * vertikaler Richtung keine automatische Anpassung. Die Eigenschaft <em>width</em> hat analog Auswirkungen auf die
 * Breite des Steuerelements.
 * @event resize - Wird ausgelöst, wenn die Grösse des Steuerelements angepasst wurde.
*/
Controls.AutoResizingControl = Class.create(Control, {
    initialize: function($super, element, resizeMargin) {
        $super(element);
        
        var handler = Event.observe(window, "resize", this._resize.bind(this));
        
        this.on("remove", function() {
			Event.stopObserving(window, "resize", handler);
        });
        
        this.setResizeMargins(resizeMargin);
    },
    
    /**
     * @method Passt die Grösse des Steuerelements an Hand der Informationen im Feld <em>_autoResizeMargin</em> an und
     * löst das Ereignis <em>resize</em> aus.
     * @private
    */
    _resize: function() {
        var windowSize = Tools.getWindowSize();
        var style = {};
        
        ["width", "height"].each(function(a) {
            if (Object.isDefined(this._autoResizeMargin[a])) {
				style[a] = (windowSize[a] - this._autoResizeMargin[a]) + "px";
            }
        }, this);
        
        this.setStyle(style);
        this.fireEvent("resize");
    },
    
    /**
	 * @method Legt die Informationen über die Art der Grössenanpassung fest wie in der Dokumentation des Konstruktors
	 * beschrieben ist.
	 * @param resizeMargin Die Informationen
    */
    setResizeMargins: function(resizeMargin) {
		/**
		 * @field {Object} Enthält Informationen darüber, wie die Grössenanpassung erfolgen soll.
		 * @private
		*/
        this._autoResizeMargin = resizeMargin;
        this._resize();
    }
});

/**
 * @class Ermöglicht es, eine grafische Schaltfläche zu generieren, die aktiviert bzw. deaktivert werden kann,
 * auf Aktionen des Benutzers reagiert (Darüberfahren mit dem Mauszeiger) und zudem wahlweise über ein Symbol, einen
 * Text oder beides als Inhalt kann.
 * @extends Control
 * @param {String} caption Der Schaltflächentext
 * @param {Function} action Die Funktion, die aufgerufen werden soll, wenn der Benutzer auf die Schaltfläche klickt
 * @param {Object} options Verschiedene optionale Einstellungen
 * @event enable - Wird ausgelöst, wenn die Schaltfläche aktiviert (anklickbar gemacht) wird
 * @event disable - Wird ausgelöst, wenn die Schaltfläche deaktiviert wird
*/
Controls.Button = Class.create(Control, {
	initialize: function($super, caption, action, options) {
		if (!Object.isString(caption)) {
			return;
		}
		
		// Überschreibt die mit options übergebenen Einstellungen mit den Standardwerten
		this.setOptions({ enabled: true,
			onlySignedIn: false,
			className: "",
			buttonClass: "standardButton",
			tag: "div",
			visible: true,
			iconAlign: "left"
		}, options);
		
		this.action = action || Prototype.emptyFunction;
		
        $super(new Element(this.options.tag, { className: "unselectable " + this.options.className }));
        
		this.setCaption(caption);
		
		this.element.innerHTML = "<div class=\"leftBoundary\">&nbsp;</div><div class=\"rightBoundary\"><div class=\"content\"></div></div>";
		this.makePropertiesFromClassNames("leftBoundary", "rightBoundary", "content");
		this.setButtonClass(this.options.buttonClass);
		
		this.on("click", action);
		
		["Over", "Down", "Out", "Up"].each(function(a) {
			this.element.observe(("mouse" + a).toLowerCase(), this["_on" + a].bind(this));
		}, this);
		
		if (this.options.onlySignedIn) {
			this._onExternalEvent(User, "signIn", this.enable, this);
			this._onExternalEvent(User, "signOut", this.disable, this);
		}
		
		this._updateContent();
		
		this._onOut();
		this.enable();
		
		if (!this.options.enabled || (this.options.onlySignedIn && !User.signedIn)) {
			this.disable();
		}
		
		if (!this.options.visible) {
			this.hide();
		}
		
		if (this.options.title) {
			this.element.writeAttribute("title", this.options.title);
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
        
        if (this.content) {
            this._updateContent();
        }
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
     * @method Aktualisiert den Inhalt der Schaltfläche. Dies wird beispielsweise nötig, wenn sich beim Deaktivieren der Schaltfläche das Symbol ändern soll.
     * @private
    */
	_updateContent: function() {
		var caption = this.getCaption();
		
		if (this.options.icon) {
			var icon = this.options.icon;
			
			if (this.options.iconDisabled && !this.enabled) {
				icon = this.options.iconDisabled;
			}
			
			var iconString = icon.toHTML(((caption) ? "icon" : "icon withoutCaption") + " " + 
				((this.options.iconAlign === "right") ? "rightAlignedIcon" : "leftAlignedIcon"));
			
			if (this.options.iconAlign === "right") {
				this.content.innerHTML = caption + iconString;
			} else {
				this.content.innerHTML = iconString + caption;
			}
		} else {
            this.content.innerHTML = caption;
        }
	},
	
	_onOver: function() {
		this._setBackground(-100);
	},
	
	_onDown: function() {
		this._setBackground(-200);
	},
	
	_onOut: function() {
		this._setBackground(0);
	},
	
	_onUp: function() {
		this._setBackground(-100);
	},
	
	setButtonClass: function(buttonClass) {
        if (this.buttonClass) {
            this.removeClassName(this.buttonClass);
        }
        
        this.addClassName(buttonClass);
        this.buttonClass = buttonClass;
	},
	
	_setBackground: function(position) {
		if (this.enabled) {
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
			this._onOut();
			
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
            this._setBackground(-300);
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

Controls.Link = Class.create(Control, {
	initialize: function($super, caption, action) {
		$super(new Element("a", { className: "linkControl", href: "javascript:void(null);" }));
		
		this.element.innerHTML = caption;
		this.element.observe("click", this.fireEvent.bind(this, "click"));
		
		this.on("click", action);
	}
});

/**
 * @class Erstellt ein grafisches Drop-Down-Auswahlmenü, ähnlich dem &lt;select&gt;-Element.<br /><br />Der Benutzer
 * klickt auf das Steuerelement, das wie eine normale Schaltfläche mit einem rechts ausgerichteten, nach unten
 * ausgerichteten Pfeil aussieht, worauf unter- oder oberhalb der Schaltfläche eine Liste mit verschiedenen
 * Auswahlmöglichkeiten erscheint, von denen der Benutzer eine mit einem Klick darauf auswählen kann. Darauf verschwindet
 * die Auswahlliste wieder und der Inhalt der Schaltfläche wird mit dem Wert der eben ausgewählten Option überschrieben.
 * @param {String[]|null} items Wahlweise können mit diesem Parameter bereits dem Konstruktor eine Liste mit
 * Auswahlmöglichkeiten als Array von Zeichenketten übergeben werden.
 * @extends Controls.Button
 * @event change - Wird ausgelöst, wenn der Benutzer eine neue Auswahl getroffen hat. Die ausgewählte Option wird dabei
 * ebenfalls übergeben.
 * @todo Muss teilweise noch etwas eleganter geschrieben werden.
*/
Controls.DropDownSelection = Class.create(Controls.Button, {
	initialize: function($super, items) {
		this._hideListListener = this._hideList.bindAsEventListener(this);
		
		/**
		 * @field {String[]} Die Auswahlmöglichkeiten, die das Steuerelement zu bieten hat.
		*/
		this._items = [];
		this._selectedElement = "";
		
		$super("Auswählen...", this._toggleList.bind(this), {
			icon: new Sprite("smallIcons", 18, "arrow"),
			iconAlign: "right",
			className: "dropDownSelection"
		});
		
		this._list = $$("body")[0].createChild({
			tag: "ul",
			className: "dropDownSelectionList"
		}).observe("click", (function(event) {
			this.selectItem(event.element().innerHTML);
		}).bindAsEventListener(this)).hide();
		
		this.addItems(items || []);
		
		// Beim Entfernen des Steuerelements werden alle Ereignisse deregistriert und die Auswahlliste ebenfalls entfernt
		this.on("remove", function() {
			this._list.remove();
		}, this);
	},
	
    /**
     * @method Fügt der Liste eine weitere Option hinzu.
     * @param {String} item Die neue Option.
    */
	addItem: function(item) {
		this._list.insert("<li>" + item + "</li>");
		this._items.push(item);
		
		if (this._items.length === 1) {
			this.selectItem(item);
		}
	},

    /**
     * @method Fügt der Liste weitere Optionen hinzu. Diese Methode gibt die übergebenen Optionen lediglich einzeln
     * an die Methode <em>addItem</em> weiter.
     * @param {String[]} items Die neuen Optionen.
    */
	addItems: function(items) {
		items.each(this.addItem, this);
	},

    /**
     * @method Macht die Liste mit den Auswahlmöglichkeiten wieder sichtbar bzw. wieder unsichtbar.
    */
	_toggleList: function() {
		if (this._list.visible()) {
			this._hideList();
		} else {
			this._showList();
		}
	},

    /**
     * @method Macht die Liste mit den Auswahlmöglichkeiten wieder sichtbar und positioniert sie entweder ober- oder
     * unterhalb der Schaltfläche.
    */
	_showList: function() {
		var buttonPos = this.element.cumulativeOffset();
		var elementSize = this.element.getDimensions();
		
		this._list.setStyle({ minWidth: elementSize.width });
		
		var listSize = this._list.getDimensions();
		var top = buttonPos[1] + ((buttonPos[1] + elementSize.height + listSize.height < Tools.getWindowSize().height) ? elementSize.height + 1 : (-1 * listSize.height + 1));
		
		this._list.setStyle({ top: top + "px", left: (buttonPos[0] - listSize.width + elementSize.width) + "px" }).show();
		
		// Drückt der Benutzer die Maustaste, wird die Auswahlliste sofort wieder entfernt
		(function() {
			Event.observe(document, "mousedown", this._hideListListener);
		}).bind(this).defer();
	},

    /**
     * @method Macht die Liste mit den Auswahlmöglichkeiten wieder unsichtbar, sofern diese Methode nicht durch einen
     * Klick innerhalb der Auswahlliste aufgerufen wurde.
    */
	_hideList: function(e) {
		if (!Position.within(this._list, Event.pointerX(e), Event.pointerY(e))) {
			this._list.hide();
			document.stopObserving("mousedown", this._hideListListener);
		}
	},
	
    /**
     * @method Gibt die aktuell ausgewählte Option zurück. Wenn keine Option ausgewählt ist, wird <em>false</em> zurückgegeben.
     * @returns {String|Boolean} Die ausgewählte Option.
    */
	getSelectedItem: function() {
		return this._selectedItem;
	},

    /**
     * @method Wählt eine bestimmte Option aus. Dabei wird automatisch die Auswahlliste versteckt, der Inhalt der
     * Schaltfläche aktualisiert und das Ereignis <em>change</em> ausgelöst.
     * @returns {String|Boolean} Die ausgewählte Option.
    */	
	selectItem: function(item) {
		this._list.hide();
		
		// Überprüft, ob die bereits ausgewählte nicht der auszuwählenden Option entspricht
		if (this._selectedItem !== item && this._items.include(item)) {
			var fireEvent = this.selectedItem !== "";
			
			this.setCaption(item);
			this._updateContent();
			this._selectedItem = item;
			
			if (fireEvent) {
				this.fireEvent("change", item);
			}
		}
	}
});

Controls.RoundedPane = function() {
	var corner = function(v, h) {
		return "<div class=\"corner " + h + "Corner " + v + "Corner " + v + h.capitalize() + "Corner\"></div>";
	};
	
	var construct = corner("top", "left") + corner("top", "right") + "<div class=\"paneContent\"></div>" + 
		corner("bottom", "left") + corner("bottom", "right");
	
	return Class.create(Control, {
		initialize: function($super, className) {
			$super(new Element("div", { className: "roundedPane " + className }));
			
			this.element.innerHTML = construct;
			
			this.corners = this.select(".corners");
			this.content = this.select(".paneContent")[0];
		}
	});
}();

Controls.TabControl = Class.create(Control, {
	initialize: function($super, contentParent) {
		$super(new Element("div", { className: "tabControl" }));
		
		this.tabs = [];
		this.activeTab = null;
		this.on("remove", this.removeAllTabs, this);
		
		this._tabParent = this.element.createChild({ tag: "ul", className: "tabParent" });
		this._contentParent = $(contentParent) || this.element.createChild({ tag: "div", className: "contentParent" });
	},
	
	addTab: function(tab, index) {
		index = index || this.tabs.length;
		
		if (index === this.tabs.length) {
			this._tabParent.insert(tab.tabElement, "bottom");
		} else {
			this.tabs[index + 1].tabElement.insert(tab.tabElement, "before"); // Funktioniert evtl. nicht
		}
		
		this._contentParent.insertControl(tab, "bottom");
		
		tab.on("activate", this._onTabActivated, this);
		
		if (!this.activeTab) {
			tab.activate();
		} else {
			tab.deactivate();
		}
		
		this.tabs.splice(index, 0, tab);
		
		this.fireEvent("addTab", tab);
		
		return tab;
	},

	removeTab: function(tab) {
		if (Object.isNumber(tab)) {
			var index = tab.limitTo(0, this.tabs.length - 1);
			tab = this.tabs[index];
		} else {
			var index = this.tabs.indexOf(tab);
		}
		
		if (this.tabs.length > 1 && tab === this.activeTab) {
			this.activateTab((index === this.tabs.length - 1) ? index - 1 : index + 1);
		} else {
			this.activeTab = null;
		}
		
		tab.remove();
		this.tabs.splice(index, 1);		
	},
	
	removeAllTabs: function() {
		while (this.tabs.length) {
			this.removeTab(this.tabs.first());
		}
	},
	
	activateTab: function(tab) {
		if (Object.isNumber(tab)) {
			tab = this.tabs[tab.limitTo(0, this.tabs.length - 1)];
		} else if (Object.isString(tab)) {
			tab = this.tabs.find(function(item) {
				return item.caption === tab;
			});
		}
		
		if (tab !== this.activeTab) {
			tab.activate();
		}
	},
	
	_onTabActivated: function(tab) {
		if (tab !== this.activeTab) {
			if (this.activeTab) {
				this.activeTab.deactivate();
			}
			
			this.activeTab = tab;
			this.fireEvent("activateTab", tab);
		}
	}
});

Controls.TabControl.TabPage = Class.create(Control, App.History.Node.prototype, {
	initialize: function($super, caption) {
		if (!caption) {
			return;
		}
		
		$super(new Element("div"));
		
		this.caption = caption;
		this.initializeHistoryNode();
		this._createTabElement();
	},
	
	activate: function() {
		this.active = true;
		this.show();
		this.fireEvent("activate", this);
	},
	
	deactivate: function() {
		this.active = false;
		this.hide();
		this.fireEvent("deactivate", this);
	},
	
	_createTabElement: function() {
		this.tabElement = new Element("li").observe("click", this.activate.bind(this));
		this.tabElement.innerHTML = this.caption;
		
		this.on("remove", function() {
			this.tabElement.stopObserving().remove();
		}, this);
	}
});

Controls.TabControl.TabPageWithButtonControl = Class.create(Controls.TabControl.TabPage, {
	initialize: function($super, caption, icon, buttonClass) {
		if (!Object.isString(caption)) {
			return;
		}
		
		this.icon = icon;
		this._buttonClass = buttonClass || "menuItem";
		
		$super(caption);
	},

	_createTabElement: function() {
		this._tabButton = new Controls.Button(this.caption, this.activate.bind(this), {
			icon: this.icon,
			buttonClass: this._buttonClass,
			tag: "li"
		});
		
		this.registerChildControl(this._tabButton);
		this.tabElement = this._tabButton.element;
		
		this.on("activate", this._tabButton.disable, this._tabButton);
		this.on("deactivate", this._tabButton.enable, this._tabButton);
	}
});

Controls.View = Class.create(Controls.TabControl.TabPageWithButtonControl, {
	initialize: function($super, caption, icon, title, options) {
		if (!Object.isString(caption)) {
			return;
		}
		
		this.setOptions({ hasAdditionalCommands: true }, options);
        $super(caption, icon);
        
        this.addClassName("viewContainer");
		
		this.contentPane = this.element.insertControl(new Controls.RoundedPane("viewPane"));
		this.content = this.contentPane.content;
		
        if (this.options.hasAdditionalCommands) {
            this.additionalCommands = this.content.createChild({ className: "additionalCommands" });
        }
        
		if (this.options.className) {
            this.addClassName(this.options.className);
        }
        
		this.title = this.content.createChild({ tag: "h2", content: title });
		
		var resizingControl = new Controls.AutoResizingControl(this.content, { height: (Browser.IE) ? 165 : 155 });
	},
	
	deactivate: function($super) {
		$super();
		
		this.removeListenersByEventName("leave");
		this.leave();
	},
	
	reportNavigation: function(state) {
		if (App.History.started) {
			if (this._currentState !== state) {
				this._handleStateChange((state || "").split("/"));
				App.History.navigate(this.caption.toLowerCase() + ((state) ? "/" + state : ""));
			}
		} else {
			this._handleStateChange((state || "").split("/"));
		}
	}
});

Controls.SideMenu = Class.create(Controls.RoundedPane, {
	initialize: function($super, view, hideAble) {
		$super("sideMenu unselectable");
		
		this.items = [];
		
		this.title   = this.content.createChild({ tag: "h3", className: "title", content: "Aktionen" });
		this.content = this.content.createChild({ tag: "ul" });
		this.help 	 = this.element.createChild({ className: "help" });
		
		view.contentPane.addClassName("withSideMenu");
		
		if (hideAble) {
			this.hideButton = this.element.createChild({
				className: "closeButton",
				title: "Seitenmenü ausblenden"
			});
			
			this.showButton = view.element.createChild({
				className: "closedSideMenu",
				style: { display: "none" },
				title: "Seitenmenü anzeigen"
			});
			
			this.hideButton.observe("click", this.hide.bindAsEventListener(this));
			this.showButton.observe("click", this.show.bindAsEventListener(this));
			
			this.on("remove", function() {
				this.hideButton.stopObserving("click");
				this.showButton.stopObserving("click");
			}, this);
			
			this.on("hide", function() {
				view.contentPane.removeClassName("withSideMenu");
				this.showButton.show();
			}, this);
			
			this.on("show", function() {
				view.contentPane.addClassName("withSideMenu");
				this.showButton.hide();
			}, this);
			
			if (Browser.IE6) {
				this.showButton.setStyle({ left: "-15px" });
			}
		}
		
		if (Browser.IE6) {
			this.setStyle({ left: "-216px" });
			this.help.setStyle({ paddingLeft: "2px" });
		}
		
		this.on("remove", function() {
			this.items.invoke("remove");
		}, this);
		
		view.element.insertControl(this);
	},
	
	addItem: function(caption, icon, action, options) {
		this.items.push(this.content.insertControl(new Controls.SideMenu.Item(caption, icon, action, options)));
	},
	
	setHelpText: function(text) {
		this.help.innerHTML = text;
	},
	
	getHelpText: function() {
		return this.help.innerHTML;
	}
});

Controls.SideMenu.Item = Class.create(Control, {
    initialize: function($super, caption, icon, action, options) {
		this.setOptions({
			abilityToDisable: true,
			enable: true,
			signedInOnly: false
		}, options);
		
		this.caption = caption;
		this.icon = icon;
		this.action = action;
		
		$super(new Element("li", { className: "sideMenuItem" }));
		
		var enabled = !!this.options.enable;
		
		this.element.observe("click", this._handleClick.bind(this));
		
		if (this.options.abilityToDisable && this.options.signedInOnly) {
			this._onExternalEvent(User, "signIn", this.enable, this);
			this._onExternalEvent(User, "signOut", this.disable, this);
			
			if (User.signedIn) {
				enabled = true;
			}
        }
        
		if (enabled) {
			this.enable();
		} else {
			this.disable();
		}
    },
    
    _handleClick: function() {
		if (this.enabled) {
			this.action();
		}
    },
    
    enable: function() {
		this.enabled = true;
		this._update();
		this.removeClassName("disabled");
		this.fireEvent("enable");
    },
    
    disable: function() {
		if (this.options.abilityToDisable) {
            this.enabled = false;
			this._update();
            this.addClassName("disabled");
            this.fireEvent("disable");
		}
    },
    
    _update: function() {
		this.element.innerHTML = ((this.enabled) ? this.icon : this.options.iconDisabled).toHTML("iconElement") + this.caption;
    }
});

Controls.Form = Class.create(Control, {
	initialize: function($super, options) {
		this.setOptions({
			submitButtonText: "Senden",
			submitButtonIcon: null
		}, options);
		
		this.fields = [];
		this.buttons = [];
		
		$super(new Element("form", { className: "form", action: "javascript:void(null)" }));
		
		this._fieldsContainer = this.element.createChild();
		
		this._buttonContainer = this.element.createChild({ className: "buttons" });
		this.element.createChild({ className: "clearFloating" });
		
		this.addButton(new Controls.Button(this.options.submitButtonText, this._onSubmit.bind(this), {
			icon: this.options.submitButtonIcon
		}));
		
		this.element.observe("submit", this._onSubmit.bind(this));
		
		this.element.observe("keypress", (function(e) {
			if (e.keyCode === Event.KEY_RETURN) {
				this._onSubmit();
			}
		}).bind(this));
	},
	
	add: function() {
		$A(arguments).each(function(field) {
			this.fields.push(field);
			this._fieldsContainer.insertControl(field);
			this.registerChildControl(field);
		}, this);
		
		return this;
	},
	
	isValid: function() {
		return !this.fields.findAll(function(field) { return !field.validate(); }, this).length;
	},
	
	getInput: function() {
		var input = {};
		
		this.fields.each(function(field) {
			input[field.name] = field.getProcessedValue();
		}, this);
		
		return input;
	},
	
	reset: function() {
		this.fields.invoke("reset");
	},
	
	addButton: function(button) {
		this._buttonContainer.insertControl(button);
		this.registerChildControl(button);
	},
	
	_onSubmit: function() {
		if (this.isValid()) {
			this.fireEvent("submit", this.getInput());
		}
	},
	
	focusFirstField: function() {
		this.element.focusFirstElement();
	}
});

Controls.Form.DataTypes = {
	mail: {
		isValid: function(value) {
			return value.isValidMailAddress();
		},
		
		invalidText: "Keine gültige E-Mailadresse angegeben"
	}
};

Controls.Form.Field = Class.create(Control, {
	initialize: function($super, fieldElement, options) {
		this.setOptions({
			defaultValue: "",
			caption: ""
		}, options);
		
		this.value = "";
		this.name = this.options.name || "field" + Controls.Form.Field.ANONYMOUS_ID++;
		this.fieldElement = fieldElement;
		
		$super(new Element("div", { className: "field" }));
		
		this._captionElement = this.element.createChild({ tag: "label" });
		this._captionElement.innerHTML = this.options.caption + ":";
		this.element.insert(this.fieldElement.addClassName("input"));
	},
	
	markAsInvalid: function(m) {
		m = m || "Der eingegebene Wert ist ungültig.";
		
		if (!this._invalidIcon) {
			this.element.insert(new Sprite("smallIcons", 20).toHTML("invalidIcon"));
			this._invalidIcon = this.select(".sprite").last().hide();
		}
		
		this._invalidIcon.writeAttribute("title", m).show();
		this.fireEvent("invalid", m);
	},
	
	markAsValid: function() {
		if (this._invalidIcon) {
			this._invalidIcon.hide();
		}
		
		this.fireEvent("valid");
	},
	
	setValue: function(value) {
		this.value = value;
		this.validate();
	},
	
	getProcessedValue: function() {
		return this.processValue(this.getValue());
	},
	
	getValue: function() {
		return this.value;
	},
	
	validateValue: function(value) {
		return true;
	},
	
	processValue: Prototype.K,
	
	validate: function() {
		if (this.validateValue(this.getProcessedValue())) {
			this.markAsValid();
			return true;
		}
		
		return false;
	},
	
	reset: function() {
		this.setValue(this.options.defaultValue);
		this.markAsValid();
		this.fireEvent("reset", this.options.defaultValue);
	}
});

Controls.Form.Field.ANONYMOUS_ID = 1;

Controls.Form.TextField = Class.create(Controls.Form.Field, {
	initialize: function($super, options) {
		options = Object.extend({
			type: "text",
			allowBlank: false,
			minLength: 0,
			dataType: ""
		}, options);
		
		if (options.type === "textarea") {
			$super(new Element("textarea"), options);
		} else {
			$super(new Element("input", { type: options.type }), options);
		}
	},
	
	setValue: function($super, value) {
		this.fieldElement.value = value;
		$super(value);
	},
	
	validateValue: function(value) {
        if (value.blank() && !this.options.allowBlank) {
			return this.markAsInvalid("Dieses Feld darf nicht leer sein.");
        }
        
        if (value.length < this.options.minLength) {
			return this.markAsInvalid("Muss mindestens " + this.options.minLength + " Zeichen lang sein.");
        }
        
        var dt = this.options.dataType;
        
        if (dt && Controls.Form.DataTypes[dt] && !Controls.Form.DataTypes[dt].isValid(value)) {
			return this.markAsInvalid(Controls.Form.DataTypes[dt].invalidText);
        }
        
        return true;
	},
	
	getValue: function() {
		return this.fieldElement.getValue();
	}
});

var DragAble = Class.create({
	initialize: function(target, source) {
		this.target = $(target);
		this.source = $(source) || this.target;
		
		this.draging = false;
		
		this.dragListener = this.drag.bindAsEventListener(this);
		this.source.observe("mousedown", this.dragListener);
	},
	
	drag: function(event) {
		if (!this.draging) {
			this.draging = true;
			
			this.offsetX = parseInt(this.target.getStyle("left"), 10);
			this.offsetY = parseInt(this.target.getStyle("top"), 10);
			
			this.x = event.clientX;
			this.y = event.clientY;
			
			this.moveListener = this.move.bindAsEventListener(this);
			this.stopDraggingListener = this.stopDragging.bind(this);
			
			document.observe("mouseup", this.stopDraggingListener);
			document.observe("mousemove", this.moveListener);
		}
	},
	
	stopDragging: function() {
		if (this.draging) {
			this.draging = false;
			
			document.stopObserving("mouseup", this.stopDraggingListener);
			document.stopObserving("mousemove", this.moveListener);
		}
	},
	
	move: function(e) {
		if (this.draging && e) {
			var windowSize = Tools.getWindowSize();
			
			var clientX = e.clientX.limitTo(0, windowSize.width);
			var clientY = e.clientY.limitTo(0, windowSize.height);
			
			this.target.setStyle({ left: this.offsetX + clientX - this.x + "px", top: this.offsetY + clientY - this.y + "px" });
		}
	},
	
	stopObserving: function() {
		this.stopDragging();
		
		this.source.stopObserving("mousedown", this.dragListener);
	}
});

Controls.Window = Class.create(Controls.RoundedPane, App.History.Node.prototype, {
	initialize: function($super, type, options) {
		if (!Object.isString(type)) {
			return;
		}
		
		this.type = type;
		
		this.setOptions({
			showTitleBar: true,
			dragAble: true,
			showOverlay: true,
			onlyAllowOne: false,
			onClickCloseButton: "close",
			centerOnScreen: true,
			containerElement: $("windowContainer")
		}, options);
		
		if (this.options.onlyAllowOne && App.Windows.hasWindowOfType(this.type)) {
			return;
		}
		
		$super("window " + ((this.options.showTitleBar) ? "withTitleBar" : "withoutTitleBar") + " " +
			this.type.lowerFirstLetter());
		
		this.element.hide();
		this.initializeHistoryNode();
		
		App.Windows.add(this);
		
		if (this.options.showTitleBar) {
			this.titleBar = this.element.createChild({ className: "titleBar", content: this.options.title });
		}
		
		this.closeButton = this.element.createChild({ className: "closeButton", content: 
			(new Sprite("smallIcons", (this.options.showTitleBar) ? 22 : 21)).toHTML()
		}).observe("click", this[(this.options.onClickCloseButton === "close") ? "close" : "hide"].bind(this));
		
		// Needs rewrite
		if (this.options.dragAble) {
			var corners = this.select(".corner");
			
			var dragAbles = [0, 1].collect(function(i) {
				return new DragAble(this.element, corners[i]);
			}, this);
			
			this.on("remove", function() {
				dragAbles.invoke("stopObserving");
			});
		}
		
		this.options.containerElement.insertControl(this);
		
		if (this.options.centerOnScreen) {
			if (Browser.Opera) {
				this.on("show", this.centerOnScreen, this);
			} else {
				this.centerOnScreen();
			}
		}
		
		if (this.options.onClickCloseButton !== "close") {
			this.on("hide", this.fireEvent.bind(this, "leave"));
		}
		
		this.on("remove", function() {
			this.closeButton.stopObserving("click");
			this.fireEvent("leave");
		}, this);
		
		return true;
	},
	
	show: function($super) {
		$super.defer();
	},
	
	update: function(content) {
        this.content.innerHTML = content;
	},
	
	/**
	 * @method Zentriert das Steuerelement basierend auf seiner Grösse im Browserfenster (Wrapperfunktion).
	 * @return {ExtendedHTMLObject} Das HTML-Element des Steuerelement.
	*/
	centerOnScreen: function() {
		return this.element.centerOnScreen();
	},
	
	leave: function() {
		this.remove();
		this._leaveActiveSubNode();
	}
});

Controls.Window.prototype.close = Controls.Window.prototype.remove;

Controls.Window.Overlay = function() {
	return new (Class.create(EventPublisher, {
		initialize: function($super) {
			$super();
			
			var self = this;
			
			App.on("beforeInitialize", function() {
				$w("overlay windowContainer").each(function(a) {
					self["_" + a] = new Controls.AutoResizingControl($(document.body).createChild(
						{ id: a }), { height: 0, width: 0 });
				});
				
				App.Windows.on("addValue", function(pair) {
					$w("show hide remove").each(function(event) {
						pair.value.on(event, self.update, self);
					});
				});
				
				self.update();
			});
		},
		
		update: function() {
			var action = (App.Windows.getNumberOfOpenWindows() === 0) ? "hide" : "show";
			
			if (action !== this._lastAction) {
				this._overlay[action]();
				this._windowContainer[action]();
				this.fireEvent(action);
				this._lastAction = action;
			}
		},
		
		_lastAction: ""
	}))();
}();

Controls.Table = Class.create(Control, {
	initialize: function($super, options) {
		this.columns = [];
		this.rows = new Collection();
		this.sortedRows = [];
		this._cachedEvents = [];
		
		this.sortAfterColumn = 0;
		this.highlightedRowId = "";
		this.sortDirection = "ascending";
		
		this.setOptions({
			cellpadding: "3px",
			enableRowHighlighting: true,
			continueHeader: true
		}, options);
		
		$super(new Element("div"));
		
		this.element.observe("mousedown", (function(event) {
			var element = event.findElement("th");
			
			if (element && element.hasClassName("sortableColumn")) {
				this.sort(element.readAttribute("name"), true);
				return;
			}
			
			if (this.options.enableRowHighlighting) {
				var element = event.findElement("tr");
				
				if (element && element.hasClassName("normalRow")) {
					this.highlightRow(element.readAttribute("name"));
				}
			}
		}).bindAsEventListener(this));
		
		this.element.observe("dblclick", (function(event) {
			var element = event.findElement("tr");
			
			if (element && element.hasClassName("normalRow")) {
				this.selectRow(element.readAttribute("name"))
			}
		}).bindAsEventListener(this));
		
		this.on("remove", this.clear, this);
	},
	
	addColumn: function(caption, getContent, options) {
		this.columns.push(new Controls.Table.Column(caption, getContent, options));
	},
	
	addRows: function(rows) {
		rows.each(this.addRow, this);
	},
	
	addRow: function(row) {
		this.sortedRows.push(this.rows.add(row));
	},
	
	clear:  function() {
		var highlightedRow = this.getHighlightedRow();
		var toKeep = this.options.keepHighlightedOnUpdate;
		
		if (highlightedRow && toKeep && highlightedRow[toKeep]) {
			this.oldHighlightedRowId = highlightedRow[toKeep];
		}
		
		this.highlightedRowId = "";
		this.rows.clear();
		this.sortedRows.clear();
		
		this.element.clear();
	},

	sort: function(value, byClick) {
		var index = -1;
		
		if (Object.isString(value)) {
			this.columns.each(function(column, i) {
				if (column.caption === value) {
					index = i;
				}
			});
		} else {
			index = value;
		}
		
		if (index >= 0 && index < this.columns.length) {
			var column = this.columns[index];
			
			if (column.sortable) {
				if (this.sortAfterColumn === index && column.allowReversedSorting && byClick) {
					this.sortDirection = (this.sortDirection === "ascending") ? "descending" : "ascending";
					this.sortedRows.reverse();
				} else {
					var toSort = [];
					
					var getContent = column.getContent;
					var sortMethod = column.sortMethod || null;
					var sortType   = column.sortType   || null;
					
					this.rows.each(function(pair) {
						toSort.push({
							key: pair.key,
							value: getContent(pair.value) || ""
						});
					});
					
					toSort.sort(function(a, b) {
						return ((Object.isFunction(sortMethod)) ? sortMethod : Comparators[(sortType !== "normal") ? sortType : "string"])(a.value, b.value);
					});
					
					this.sortedRows = toSort.pluck("key");
					this.sortAfterColumn = index;
					
					if (column.standardSortDirection === "ascending") {
						this.sortDirection = "ascending";
					} else {
						this.sortedRows.reverse();
						this.sortDirection = "descending";
					}
				}
				
				this.fireEvent("sort", column.caption);
				this.refresh();
			}
		}
	},
	
	highlightRow: function(key) {
		if (key && this.rows.get(key)) {
			if (this.highlightedRowId) {
				this.select(".normalCellHighlighted").invoke("removeClassName", "normalCellHighlighted");
			}
			
			this.select("." + key).invoke("addClassName", "normalCellHighlighted");
			this.highlightedRowId = key;
			this.fireEvent("highlightRow", this.rows.get(key));
		}
	},
    
    selectRow: function(key) {
        this.fireEvent("selectRow", this.rows.get(key));
    },
	
	resort: function() {
		this.sort(this.sortAfterColumn);
	},
	
	getHighlightedRow: function() {
		return this.rows.get(this.highlightedRowId);
	},
	
	refresh: function() {
		var sortAfterColumn = this.sortAfterColumn;
		var sortDirection = this.sortDirection;
		var sortedColumn = this.columns[sortAfterColumn];
		var continueHeader = this.options.continueHeader;
		var outlookGroups = sortedColumn.showSortedInGroups === "outlookStyle";
		var mergedGroups = sortedColumn.showSortedInGroups === "mergeGroupCell";
		var groups = outlookGroups || mergedGroups;
		var enableRowHighlighting = this.options.enableRowHighlighting;
		
		var self = this;
		
		if (groups) {
			var groupHTML = ["<tr><td class=\"", "\" colspan=\"" + (this.columns.length + 
				((continueHeader) ? 1 : 0)) + "\">", "</td></tr>"];
			
			var mergedCellHTML = ["<td class=\"normalCell mergedCell\" rowspan=\"rowspanToReplace\"" +
				((sortAfterColumn === 0) ? " style=\"border-left: none;\"" : "") + ">", "</td>"];
		}
		
		var header = this.columns.collect(function(column, i) {
			if (column.visible && !(sortAfterColumn === i && outlookGroups)) {
				var content = (column.icon) ? column.icon.toHTML("columnIcon") : column.caption;
				var align = (column.centerColumnText) ? "center" : "left";
				var classNames = [];
				
				if (column.sortable) {
					classNames.push("sortableColumn");
				}
				
				if (sortAfterColumn === i && column.allowReversedSorting) {
					classNames.push("sorted");
					content = new Sprite("smallIcons", (sortDirection === "ascending") ? 18 : 19).toHTML("sortIcon") + content;
				}
				
				return "<th name=\"" + column.caption + "\" class=\"" + classNames.join(" ") + "\" style=\"width: " +
					column.width + "; text-align: " + align + ";\">" + content + "</th>";
			}
		}).join("");
		
		var output = "<tr class=\"tableHeader\">" + header + ((continueHeader) ? 
			"<th style=\"border: none;\">&nbsp;</th>" : "") + "</tr>";
		
		var lastSortContent = null;
		
		if (mergedGroups) {
			var mergedRowsRowspans = [];
		}
		
		this.sortedRows.each(function(id, i) {
			var rowHTML = ["<td class=\"normalCell " + ((enableRowHighlighting) ? 
				"highlightableCell " : "") + id + "\">", "</td>"];
			
			var currentRow = self.rows.get(id);
			var sortedColumnRowContent = sortedColumn.getContent(currentRow);
			
			if (sortedColumn.showSortedInGroups) {
				var newGroup = sortedColumnRowContent !== lastSortContent;
				
				if (Object.isFunction(sortedColumn.belongsToGroup)) {
					newGroup = !sortedColumn.belongsToGroup(sortedColumnRowContent, lastSortContent);
				}
				
				var content = "";
				var className = "";
				
				if (newGroup) {
					if (mergedGroups && i !== 0) {
						className = "tableGroupMergedDivider";
					} else if (outlookGroups) {
						className = "tableGroupOutlook";
						content = sortedColumn.processGroupCaption(sortedColumnRowContent);
					}
					
					if (className) {
						output += groupHTML[0] + className + groupHTML[1] + content + groupHTML[2];
					}
				}
				
				lastSortContent = sortedColumnRowContent;
			}
			
			var row = "<tr name=\"" + id + "\" class=\"normalRow\">";
			
			row += self.columns.collect(function(column, j) {
					if (column.visible) {
						if (!(j === sortAfterColumn && outlookGroups)) {
							var content = column.getContent(currentRow);
							
							content = (Object.isString(content) || Object.isNumber(content)) ?
								column.processCellContent(content, currentRow) : "&nbsp;";
							
							if (j === sortAfterColumn && mergedGroups) {
								if (newGroup) {
									mergedRowsRowspans.push(1);
									return mergedCellHTML[0] + content + mergedCellHTML[1];
								} else {
									++mergedRowsRowspans[mergedRowsRowspans.length - 1];
								}
							} else {
								return rowHTML[0] + content + rowHTML[1];
							}
						}
					}
				}).join("");
				
			row += ((continueHeader) ? rowHTML[0]  + "&nbsp;" + rowHTML[1] : "") + "</tr>";
			
			output += row;
		});
		
		if (mergedGroups) {
			mergedRowsRowspans.each(function(rowspan) {
				output = output.replace("rowspanToReplace", new String(rowspan));
			});
		}
		
		this.element.clear();
		this.element.innerHTML = "<table class=\"table\" style=\"cellpadding=\"" + this.options.cellpadding + "\"><tbody>" +
			output + "</tbody></table>";
		
		this.fireEvent("refresh");
		
		if (enableRowHighlighting) {
			var toKeep = this.options.keepHighlightedOnUpdate;
			var oldKey = this.oldHighlightedRowId;
			
			if (!this.highlightedRowId && toKeep && oldKey) {
				var row = this.rows.find(function(pair) {
					return pair.value[toKeep] === oldKey;
				}, this);
				
				if (row) {
					this.highlightedRowId = row.key;
				}
				
				this.oldHighlightedRowId = null;
			}
			
			this.highlightRow(this.highlightedRowId);
		}
	}
});

Controls.Table.Column = Class.create({
	initialize: function(caption, getContent, options) {
		this.caption = caption;
		this.getContent = (Object.isString(getContent)) ? function(a) { return a[getContent]; } : getContent;
		
		Object.extend(this, options);
		
		this.processCellContent = (Object.isFunction(this.processCellContent)) ? this.processCellContent : Prototype.K;
		this.processGroupCaption = (Object.isFunction(this.processGroupCaption)) ? this.processGroupCaption : this.processCellContent;
		this.sortType = this.sortType || "normal";
		this.visible = (Object.isDefined(this.visible)) ? this.visible : true;
		this.standardSortDirection = this.standardSortDirection || "ascending";
	},
	
	// Nicht sauber gelöst
	show: function() {
		this.visible = true;
	},
	
	hide: function() {
		this.visible = false;
	}
});

Controls.ProgressBar = Class.create(Control, {
	initialize: function($super) {
		$super(new Element("div", { className: "progressBar" }));
		
		this._progressElement = this.element.createChild({ className: "progress" });
	},
	
	setProgress: function(progress) {
		this._progressElement.setStyle({ width: (100 * progress) + "%" });
	}
});

Controls.Calendar = function() {
	var html = "<table cellpadding=\"0px\" cellspacing=\"0px\">" +
		"	<tr class=\"header\">" +
		"		<td>" + new Sprite("smallIcons", 23).toHTML("navigation") + "</td>" +
		"		<td colspan=\"5\"></td>" +
		"		<td>" + new Sprite("smallIcons", 24).toHTML("navigation") + "</td>" +
		"	</tr><tr>" +
		$R(0, 6).collect(function(w) {
			return "<td class=\"weekdays\">" + Date.weekdaysAbbr[w] + "</td>";
		}).join("") +
		"</tr></table><div class=\"content\"></div>";
	
	return Class.create(Control, {
		initialize: function($super, options) {
			this.setOptions({
				allowWeekends: true,
				allowPast: true
			}, options);
			
			$super(new Element("div", { className: "calendar" }));
			
			this.element.innerHTML = html;
			
			var navElements = this.select(".navigation");
			
			this.buttonPrevious = navElements[0].observe("mousedown", this.displayPreviousMonth.bind(this));
			this.buttonNext = navElements[1].observe("mousedown", this.displayNextMonth.bind(this));
			
			this.header	= this.select("td")[1];
			
			this.content = this.select(".content")[0].observe("click", (function(event) {
				var element = Event.element(event);
				var day = parseInt(element.innerHTML);
				
				if (element.hasClassName("selectableDay")) {
					var date = new Date(this.displayedYear, this.displayedMonth, day);
					
					if (!(this.selectedDate.getTimestamp() === date.getTimestamp())) {
						this.setSelectedDate(date);
					}
				}
			}).bindAsEventListener(this));
			
			this.setSelectedDate(this.options.initialDate || new Date().removeTime());
			
			this.on("remove", function() {
				this.buttonPrevious.stopObserving("mousedown");
				this.buttonNext.stopObserving("mousedown");
			}, this);
		},
		
		displayPreviousMonth: function() {
			var now = new Date();
			
			if (!this.options.allowPast && 
				this.displayedMonth === now.getMonth() &&
				this.displayedYear === now.getFullYear()) {
				return;
			}
			
			if (this.displayedMonth === 0) {
				this.displayedYear--;
				this.displayedMonth = 11;
			} else {
				this.displayedMonth--;
			}
			
			this.update();
		},
		
		displayNextMonth: function() {
			if (this.displayedMonth === 11) {
				this.displayedYear++;
				this.displayedMonth = 0;
			} else {
				this.displayedMonth++;
			}
			
			this.update();
		},
		
		setSelectedDate: function(date) {
			var todaysTimestamp = Date.getTodaysTimestamp();
			
			this.selectedDate = date;
			
			if (!this.options.allowPast && this.selectedDate.getTimestamp() < todaysTimestamp) {
				this.selectedDate.setTimestamp(todaysTimestamp);
			}
			
			var day = this.selectedDate.getDay();
			
			if (!this.options.allowWeekends && (day === 0 || day === 6)) {
				this.selectedDate.add((day === 0) ? 1 : 2, "days");
			}
			
			if (!new Date(this.displayedYear, this.displayedMonth, this.selectedDate.getDate()).equals(this.selectedDate)) {
				this.displayedMonth = this.selectedDate.getMonth();
				this.displayedYear = this.selectedDate.getFullYear();
				this.update();
			} else {
				this._highlightSelectedDay();
			}
		},
		
		_highlightSelectedDay: function() {
			this.select(".selectedDay").invoke("removeClassName", "selectedDay");
			this.select(".day" + this.selectedDate.getDate())[0].addClassName("selectedDay");
		},
		
		update: function() {
			var todaysTimestamp = Date.getTodaysTimestamp();
			var selectedTimestamp = this.selectedDate.getTimestamp();
			
			var firstWeekdayDay = new Date(this.displayedYear, this.displayedMonth, 1).getDay();
			
			var daysPerMonth = ((this.displayedMonth === 1) && (
				this.displayedYear % 400 === 0 || (
				this.displayedYear % 4 === 0 &&
				this.displayedYear % 100 !== 0))) ? 29 : Date.daysPerMonth[this.displayedMonth];
			
			var rows = 5;
			
			if ((daysPerMonth === 31 && firstWeekdayDay > 4) ||
				(daysPerMonth === 30 && firstWeekdayDay === 6)) {
				var rows = 6;
			} else if (daysPerMonth === 28 && firstWeekdayDay === 0) {
				var rows = 4;
			}
			
			this.content.clear();
			
			var output = "";
			
			for (var j = 0; j < rows; j++) { 
				var row = "";
				
				for (var i = 1; i <= 7; i++) {
					var day = j * 7 + (i - firstWeekdayDay);
					var dayText = "";
					var classNames = [];
					
					if (day >= 1 && day <= daysPerMonth) {
						var dayObject = new Date(this.displayedYear, this.displayedMonth, day);
						var dayTimestamp = dayObject.getTimestamp();
						
						dayText = day;
						classNames.push("day" + day);
						
						if (dayTimestamp === todaysTimestamp) {
							classNames.push("today");
						}
						
						if (dayTimestamp === selectedTimestamp) {
							classNames.push("selectedDay");
						}
						
						var allowToSelect = !(this.options.allowWeekends === false && (i === 1 || i === 7));
						
						if (!this.options.allowPast && dayTimestamp < todaysTimestamp) {
							allowToSelect = false;
						}
						
						if (allowToSelect) {
							classNames.push("selectableDay");
						} else {
							classNames.push("disabledDay");
							
							if (classNames.include("today")) {
								classNames.push("todayDisabled");
							}
						}
					}
					
					row += "<td class=\"day " + classNames.join(" ") + "\">" + dayText  + "</td>";
				}
				
				output += "<tr>" + row + "</tr>";
			}
			
			this.content.innerHTML = "<table cellspacing=\"0px\" cellpadding=\"0px\"><tbody>" + output + "</tbody></table>";
			this.header.innerHTML = Date.months[this.displayedMonth] + " " + this.displayedYear;
		}
	});
}();