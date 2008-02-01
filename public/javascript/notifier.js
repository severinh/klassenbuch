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

App.on("beforeInitialize", function() {
	App.Notifier = function() {
		var klass = Class.create(Control, {
			initialize: function($super){
				$super(new Element("div", {
					id: "notifier"
				}));
				
				this.element.hide();
				this._messageElement = this.element.createChild({ tag: "span", className: "message" });
				this._closeLink = new Controls.Link("Schliessen", this.closeActive.bind(this));
				
				this.element.insertControl(this._closeLink);
				this.registerChildControl(this._closeLink);
				
				$$("body")[0].insertControl(this);
				
				this._queue = [];
				this._active = false;
			},
			
			addToQueue: function(type, message) {
				if (this._queue.length && message === this._queue.last().message) {
					return;
				}
				
				this._queue.push({ type: type, message: message });
				this.display();
			},
			
			display: function() {
				if (!this._queue.length) {
					this.hide();
					return;
				} else if (!this._active) {
					var notification = this._queue.first();
					
					this._messageElement.innerHTML = notification.message;
					this.element.className = "";
					this.element.addClassName(notification.type);
					this.show();
					this.element.centerHorizontally();
					this._active = true;
				}
			},
			
			closeActive: function() {
				this._active = false;
				this._queue.shift();
				this.display();
			}
		});
		
		$w("warn error info").each(function(type) {
			klass.prototype[type] = klass.prototype.addToQueue.curry(type);
		});
		
		return new klass();
	}();
});