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
		this._handleClick = (function(event) {
			var element = event.element();
			
			if (element.match(".dropDownSelectionList li")) {
				this.selectItem(element.innerHTML);
			} else if (!element.up("#" + this.id)) {
				this._hideList();
			}
		}).bindAsEventListener(this);
		
		/**
		 * @field {String[]} Die Auswahlmöglichkeiten, die das Steuerelement zu bieten hat.
		*/
		this._items = [];
		this._selectedElement = "";
		
		$super("Auswählen...", this._toggleList.bind(this), {
			icon: new Sprite("smallIcons", 18, "arrow"),
			className: "dropDownSelection"
		});
		
		this._list = $$("body")[0].createChild({
			tag: "ul",
			className: "dropDownSelectionList"
		}).hide();
		
		this.addItems(items || []);
		
		// Beim Entfernen des Steuerelements werden alle Ereignisse deregistriert und die Auswahlliste ebenfalls entfernt.
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
		var top = buttonPos[1] + ((buttonPos[1] + elementSize.height + listSize.height < document.viewport.getHeight()) ? elementSize.height + 1 : (-1 * listSize.height + 1));
		
		this._list.setStyle({ top: top + "px", left: (buttonPos[0] - listSize.width + elementSize.width) + "px" }).show();
		
		// Drückt der Benutzer die Maustaste, wird die Auswahlliste sofort wieder entfernt
		document.observe("mousedown", this._handleClick);
	},
	
	_hideList: function() {
		document.stopObserving("mousedown", this._handleClick);
		this._list.hide();
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