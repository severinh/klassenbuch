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

Controls.Menu = Class.create(Controls.TabControl, {
	initialize: function($super, initialState) {
		$super("content", false);
		
		this.initializeHistoryNode(initialState);
		
		var self = this;
		
		this.on("addTab", function(tab) {
			tab.removeListenersByEventName("activationEvent");
			tab.on("activationEvent", self.reportNavigation.bind(self, tab.caption.toLowerCase()));
			
	        self.registerSubNode(tab.caption.toLowerCase(), function() {
				return self.activateTab(tab.caption);
			});
		});
	},
	
	activateTab: function(tab) {
		tab = this.getTab(tab);
		
		tab.activate();
		
		this.activeTab = tab;
		this.fireEvent("activateTab", tab);
		
		return tab;
	}
}).addMethods(App.History.RootNode);