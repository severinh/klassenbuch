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
        var windowSize = document.viewport.getDimensions();
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