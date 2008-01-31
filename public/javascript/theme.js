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

App.ThemeManager = new (Class.create({
	initialize: function() {
		var updateTheme = function() {
			this.setTheme(User.settings.get("theme"));
		};
		
		App.on("beforeInitialize", function() {
			User.on("signIn", updateTheme, this);
			User.on("signOut", updateTheme, this);
		}, this);
	},
	
	switchTheme: function(theme) {
		$$("link")[1].writeAttribute("href", "design/" + theme + "/css/design.css");
		this.currentTheme = theme;
		this.fireEvent("changetheme", theme);
	},
	
	setTheme: function(theme) {
		if (theme !== this.currentTheme && this.availableThemes.get(theme)) {
			this.switchTheme(theme);
		}
	},
	
	currentTheme: User.settings.get("theme"),
	
	availableThemes: $H({
		"default": "Standard-Design",
		"nonzero": "nonZero"
	})
}).addMethods(Observable))();
