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

Controls.View = Class.create(Controls.TabControl.TabPageWithButtonControl, {
	initialize: function($super, caption, icon, title, options) {
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
		
		var resizingControl = new Controls.AutoResizingControl(this.content, { height: (Prototype.Browser.IE) ? 165 : 155 });
	},
	
	leave: function() {
		this.deactivate();
		this._leaveActiveSubNode();
	}
});