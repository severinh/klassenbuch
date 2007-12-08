/*
 * Klassenbuch
 * Copyright (C) 2006 - 2007 Severin Heiniger
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

var Contacts = new (Class.create(JSONRPC.Store, {
	initialize: function($super) {
		$super({
			method: "getcontacts",
			periodicalUpdate: 120
		});
		
		App.on("initialize", function() {
			this.options.itemClass = Contacts.Contact;
			this.loadData(DirectData.get("contacts").result);
			
			User.on("signIn", this.load, this);
			User.on("signOut", this.hidePersonalInformation, this);
		}, this);
	},
	
    hidePersonalInformation: function() {
        this.invoke("hidePersonalInformation");
        this.fireEvent("updated");
    },
    
    getClassMembers: function() {
		return this.getItems("classmember", true);
    }
}))();

Contacts.View = Class.create(Controls.View, {
	initialize: function($super) {
		$super("Kontaktliste", new Sprite("smallIcons", 14), "Kontaktliste", { className: "contactView" });
		
		this.registerSubNode("profil", (function(state) {
				var contact = Contacts.find(function(contact) {
					return contact.getFlattenedFullName() === state.first();
				});
				
				if (contact) {
					return contact.showProfile();
				}
			}).bind(this), {
				rebuildOnStateChange: true
			}
		);
		
		this.on("activate", function() {
			if (!this.contactTable) {
				var table = new Controls.Table({ keepHighlightedOnUpdate: "id" });
				
				table.on("sort", this._updateTitle, this);
				table.on("highlightRow", this._onHighlightRow, this);
				table.on("selectRow", function(contact) {
					this.reportNavigation("profil/" + contact.getFlattenedFullName());
				}, this);
				
				var processCell34 = function(a) {
					return a.replace("hidden", "<span class=\"hiddenInformation\">000 000 00 00</span>");
				};
				
				table.addColumn("Name", function(a) {
						return a.getFullName();
					}, {
						width: "150px",
						sortable: true,
						allowReversedSorting: true
				});
				
				table.addColumn("Nickname", "nickname", {
					width: "120px",
					sortable: true,
					allowReversedSorting: true
				});
				
				table.addColumn("Telefon", "phone", {
					width: "100px",
					sortable: false,
					processCellContent: processCell34
				});
				
				table.addColumn("Natel", "mobile", {
					width: "100px",
					sortable: false,
					processCellContent: processCell34
				});
				
				table.addColumn("SF", "mainsubject", {
					width: "50px",
					sortable: true,
					showSortedInGroups: "outlookStyle",
					
					processGroupCaption: function(content) {
						return content.replace("PAM", "Physik und Anwendungen der Mathematik");
					}
				});
				
				table.addColumn("Status", function(contact) {
					return contact.getState();
				}, {
					width: "75px",
					processCellContent: function(content) {
						return (content == "Offline") ? "" : content;
					}
				});
				
				this.contactTable = this.content.insertControl(table);
				
				var sideMenu = new Controls.SideMenu(this, false);
				
				sideMenu.addItem("Profil anzeigen", new Sprite("fileTypesSmall", 0), (function() {
						this.reportNavigation("profil/" + this.contactTable.getHighlightedRow().getFlattenedFullName());
					}).bind(this), {
						abilityToDisable: true,
						iconDisabled: new Sprite("fileTypesSmall", 0),
						enable: false
				});
				
				sideMenu.addItem("E-Mail senden", new Sprite("smallIcons", 9), this.sendMailToOne.bind(this),   {
					abilityToDisable: true,
					iconDisabled: new Sprite("smallIcons", 10),
					enable: false
				});
				
				sideMenu.addItem("E-Mail an alle senden", new Sprite("smallIcons", 9), this.sendMailToAll.bind(this), {
					abilityToDisable: true,
					iconDisabled: new Sprite("smallIcons", 10),
					signedInOnly: true
				});
				
				sideMenu.setHelpText("Hier findest du die Kontakt-<br />informationen unserer Klasse. " +
					"<span style=\"display: none;\">Mit einem Doppelklick auf eine Person öffnest du ihr Profil.</span>" +
					"<br /><br /><span class=\"notSignedIn\"" + 
					((User.signedIn) ? " style=\"display: none;\"" : "") + ">" + "Um eine E-Mail an eine einzelne " +
					"Person oder gleich alle zu senden, musst du dich zuerst anmelden.</span><span class=\"signedIn\"" + 
					((User.signedIn) ? "" : " style=\"display: none;\"") + ">Du kannst auch eine E-Mail an eine " +
					"einzelne Person oder gleich alle in der Klasse senden.</span>");
				
				this.sideMenu = sideMenu;
				
				this.registerChildControl(this.contactTable, this.sideMenu);
				
				this._onExternalEvent(User, "signIn", function() {
					this.sideMenu.items[1][(this.contactTable.highlightedRowId) ? "enable" : "disable"]();
				}, this);
				
				this._onExternalEvent(User, "signOut", function() {
					this.sideMenu.items[1].disable();
				}, this);
				
				this._onExternalEvent(Contacts, "updated", this.update, this);
				
				this.update();
			}
		}, this);
	},
	
	_onHighlightRow: function() {
		this.sideMenu.items[0].enable();
		
		if (User.signedIn) {
			this.sideMenu.items[1].enable();
		}
	},
	
	sendMailToOne: function() {
		var row = this.contactTable.getHighlightedRow();
		
		if (row && row.mail) {
			this.sendMailTo([row.mail]);
		}
	},
	
	sendMailToAll: function() {
		if (User.signedIn) {
			this.sendMailTo(Contacts.getClassMembers().pluck("mail"));
		}
	},
	
	sendMailTo: function(addresses) {
		window.location.href = "mailto:" + addresses.join(",");
	},
	
	_updateTitle: function(name) {
		switch (name) {
			case "Nickname": this.title.innerHTML = "Kontaktliste (sortiert nach Nickname)"; break;
			case "SF": 	     this.title.innerHTML = "Kontaktliste (sortiert nach Schwerpunktfach)"; break;
			default:   	     this.title.innerHTML = "Kontaktliste"; break;
		}
	},
	
	update: function() {
		var contacts = Contacts.getClassMembers();
		
		this.contactTable.clear();
		this.contactTable.addRows(contacts);
		this.contactTable.resort();
		
		if (!this.contactTable.getHighlightedRow()) {
			this.sideMenu.items[0].disable();
			this.sideMenu.items[1].disable();
		}
	}
});

Contacts.Contact = Class.create({
	initialize: function(contact) {
        this.update(contact);
	},
	
	getFullName: function() {
		return this.firstname + " " + this.surname;
	},
	
	getFullAddress: function() {
		return (this.address || "") + "<br />" + (this.plz || "") + " " + (this.location || "");
	},
	
	showProfile: function() {
		return new Contacts.Contact.Window(this);
	},
	
	update: function(contact) {
        Object.extend(this, contact);
	},
	
	hidePersonalInformation: function() {
		if (this.mail) {
			this.mail = "hidden";
		}
		
		if (this.phone) {
			this.phone = "hidden";
		}
		
		if (this.mobile) {
			this.mobile = "hidden";
		}
		
		this.address = "hidden";
		this.plz = 0;
		this.location = "";
	},
	
	getFlattenedFullName: function() {
		return this.getFullName().addressify();
	},
	
	getState: function() {
		var states = User.StateDetection;
		
		switch (this.state) {
			case states.AWAY: 	return "Abwesend";
			case states.ONLINE: return "Online";
			default: 			return "Offline";
		}
	}
});

Contacts.Contact.Window = Class.create(Controls.Window, {
	initialize: function($super, contact) {
		var title = "Profil von " + (contact.nickname || contact.getFullName());
		
		if (!$super("ContactWindow", { onlyAllowOne: true, title: title })) {
			return;
		}
		
		var row = new Template("<tr><td class=\"caption\">#{caption}:</td><td>#{content}</td></tr>"),
			totalComments = Contacts.pluck("posts").inject(0, function(acc, n) { return acc + n; });
		
		this.update("<h2>" + title + "</h2><h3>Kontaktinformationen</h3><table class=\"simpleList\">" +
			row.evaluate({
				caption: "Name",
				content: "<strong>" + contact.getFullName() + "</strong>"
			}) + ((User.signedIn) ?
			
			row.evaluate({
				caption: "Adresse",
				content: contact.getFullAddress() || ""
			}) +
			
			row.evaluate({
				caption: "Telefon",
				content: contact.phone || ""
			}) +
			
			row.evaluate({
				caption: "Natel",
				content: contact.mobile || ""
			}) +
			
			row.evaluate({
				caption: "E-Mail",
				content: "<a href=\"mailto:" + contact.mail + "\">" + contact.mail + "</a>"
			}) : "") +
			
			"</table><h3>Sonstiges</h3><table class=\"simpleList\">" +
			
			row.evaluate({
				caption: "Schwerpunktfach",
				content: contact.mainsubject
			}) +
			
			row.evaluate({
				caption: "Anzahl Kommentare",
				content: contact.posts + " <small>(" + (contact.posts / totalComments * 100).roundTo(2) +
					"% aller Kommentare)</small>"
			}) +
			
			row.evaluate({
				caption: "Status",
				content: contact.getState()
			}) +
			
			"</table>"
		);
		
		this.show();
	}
});

App.on("initialize", function() { App.Menu.addTab(new Contacts.View()); });