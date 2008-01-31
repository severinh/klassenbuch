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

Controls.Window = Class.create(Controls.RoundedPane, {
	initialize: function($super, type, options) {
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
			this.type.charAt(0).toLowerCase() + this.type.substring(1));
		
		this.initializeHistoryNode();
		this.element.hide();
		
		App.Windows.add(this);
		
		if (this.options.showTitleBar) {
			this.titleBar = this.element.createChild({ className: "titleBar", content: this.options.title });
		}
		
		this.closeButton = this.element.createChild({ className: "closeButton", content: 
			(new Sprite("smallIcons", (this.options.showTitleBar) ? 22 : 21)).toHTML()
		}).observe("mousedown", this[(this.options.onClickCloseButton === "close") ? "close" : "hide"].bind(this));
		
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
			if (Prototype.Browser.Opera || Prototype.Browser.WebKit) {
				this.on("show", this.centerOnScreen, this);
			} else {
				this.centerOnScreen();
			}
		}
		
		if (this.options.onClickCloseButton !== "close") {
			this.on("hide", this.fireEvent.bind(this, "leave"));
		}
		
		this.registerShortcut([Event.KEY_ESC], this.close, this);
		this.enableShortcuts();
		
		this.on("enterSubNode", this.disableShortcuts, this);
		this.on("leaveSubNode", this.enableShortcuts, this);
		
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
	
	leave: function() {
		this.remove();
		this._leaveActiveSubNode();
	}
}).addMethods(App.History.Node);

Controls.Window.prototype.close = Controls.Window.prototype.remove;

Controls.Window.Overlay = function() {
	return new (Class.create({
		initialize: function() {
			var self = this;
			
			App.on("beforeInitialize", function() {
				$w("overlay windowContainer").each(function(a) {
					self["_" + a] = new Controls.AutoResizingControl($(document.body).createChild(
						{ id: a }), { height: 0, width: 0 });
				});
				
				App.Windows.on("add", function(window) {
					$w("show hide afterremove").each(function(event) {
						window.on(event, self.update, self);
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
	}).addMethods(Observable))();
}();

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
			
			this._windowSize = document.viewport.getDimensions();
		}
	},
	
	stopDragging: function() {
		if (this.draging) {
			this.draging = false;
			
			document.stopObserving("mouseup", this.stopDraggingListener);
			document.stopObserving("mousemove", this.moveListener);
		}
	},
	
	move: function(event) {
		if (this.draging && event) {
			var clientX = event.clientX.limitTo(0, this._windowSize.width);
			var clientY = event.clientY.limitTo(0, this._windowSize.height);
			
			this.target.setStyle({
				left: this.offsetX + clientX - this.x + "px",
				top: this.offsetY + clientY - this.y + "px"
			});
		}
	},
	
	stopObserving: function() {
		this.stopDragging();
		
		this.source.stopObserving("mousedown", this.dragListener);
	}
});