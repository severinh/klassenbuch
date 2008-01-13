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

Controls.TabControl = Class.create(Control, {
	initialize: function($super, contentParent, autoActivateTabs) {
		$super(new Element("div", { className: "tabControl" }));
		
		this.tabs = [];
		this.autoActivateTabs = Object.isDefined(autoActivateTabs) ? autoActivateTabs : true;
		this.activeTab = null;
		this.on("remove", this.removeAllTabs, this);
		
		this._tabParent = this.element.createChild({ tag: "ul", className: "tabParent" });
		this._contentParent = $(contentParent) || this.element.createChild({ tag: "div", className: "contentParent" });
	},
	
	addTab: function(tab, index) {
		if (!Object.isNumber(index)) {
			index = this.tabs.length;
		}
		
		if (index === this.tabs.length) {
			this._tabParent.insert(tab.tabElement);
		} else {
			this.tabs[index].tabElement.insert({ before: tab.tabElement });
		}
		
		this.registerChildControl(tab);
		this._contentParent.insertControl(tab, "bottom");
		
		tab.on("activationEvent", this.activateTab, this);
		
		if (!(this.autoActivateTabs && !this.activeTab)) {
			tab.deactivate();
		} else {
			this.activateTab(tab);
		}
		
		this.tabs.splice(index, 0, tab);
		this.fireEvent("addTab", tab);
		
		return tab;
	},

	removeTab: function(tab) {
		tab = this.getTab(tab);
		
		var index = this.tabs.indexOf(tab);
		
		if (this.tabs.length > 1 && tab === this.activeTab) {
			this.activateTab((index === this.tabs.length - 1) ? index - 1 : index + 1);
		} else {
			this.activeTab = null;
		}
		
		tab.remove();
		this.tabs.splice(index, 1);
	},
	
	removeAllTabs: function() {
		this.activeTab = null;
		this.tabs.invoke("remove");
		this.tabs = [];
	},
	
	getTab: function(tab) {
		if (Object.isNumber(tab)) {
			return this.tabs[tab.limitTo(0, this.tabs.length - 1)];
		} else if (Object.isString(tab)) {
			return this.tabs.find(function(item) {
				return item.caption === tab;
			});
		}
		
		return tab;
	},
	
	activateTab: function(tab) {
		tab = this.getTab(tab);
		
		if (tab !== this.activeTab) {
			if (this.activeTab) {
				this.activeTab.deactivate();
			}
			
			tab.activate();
			
			this.activeTab = tab;
			this.fireEvent("activateTab", tab);
		}
		
		return tab;
	}
});

Controls.TabControl.TabPage = Class.create(Control, {
	initialize: function($super, caption) {
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
		this.tabElement = new Element("li").observe("click", this.fireEvent.bind(this, "activationEvent", this));
		this.tabElement.innerHTML = this.caption;
		
		this.on("remove", function() {
			this.tabElement.stopObserving().remove();
		}, this);
	}
}).addMethods(App.History.Node);

Controls.TabControl.TabPageWithButtonControl = Class.create(Controls.TabControl.TabPage, {
	initialize: function($super, caption, icon, buttonClass) {
		this.icon = icon;
		this._buttonClass = buttonClass || "menuItem";
		
		$super(caption);
	},

	_createTabElement: function() {
		this._tabButton = new Controls.Button(this.caption, (function() {
			this.fireEvent("activationEvent", this);
		}).bind(this), {
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