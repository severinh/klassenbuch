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
				title: "Seitenmenü anzeigen"
			}).hide();
			
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