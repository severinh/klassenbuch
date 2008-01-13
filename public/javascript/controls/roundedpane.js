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