/**
 * @class Bietet Zugriff auf die Kontaktinformationen der Klassenmitglieder. Sensible Informationen werden erst vom Server
 * geladen, wenn der Benutzer sich anmeldet. Zudem werden diese lokalen Informationen wieder gelöscht, wenn der Benutzer
 * sich abmeldet. Die Kontaktliste liegt in Form eines Array vor, das Objekte vom Typ <em>Contacts.Contact</em> enthält. Diese
 * Klasse bietet zusätzlich bequeme Zugriffsfunktionen auf diese Daten. Die Klasse führt von Zeit zu Zeit automatisch eine
 * Aktualisierung der Daten durch, wobei die Serverantworten zusätzlich gecached werden.
 * @singleton
 * @event updated - Wird ausgelöst, wenn sich die Kontaktinformationen aktualisiert wurden.
*/
var Contacts = new (Class.create(EventPublisher, {
    initialize: function($super) {
		this.contacts = new Hash();
		
		$super();
		
		var self = this;
		var init = function() {
			if (!self.initialized) {
				self.periodicalUpdate = new PeriodicalExecuter(self.update.bind(self), 120);
				
				var data = DirectData.get("contacts");
				
				if (data) {
					self._updateSuccess(new JSONRPC.Response(data.result));
				}
				
				User.on("signIn", self.update, self);
				User.on("signOut", self.hidePersonalInformation, self);
				
				self.initialized = true;
			}
		};
		
		if (App.initialized) {
			init();
		} else {
			App.on("initialize", init);
		}
    },
    
    update: function() {
		var request = new JSONRPC.Request("getcontacts", [], {
			onSuccess: this._updateSuccess.bind(this)
		});
    },
    
    _updateSuccess: function(response) {
		this.contacts.nonDestructiveUpdateFromArray(response.result, "id", function(contact) {
			return new Contacts.Contact(contact);
		});
		
		this.fireEvent("updated");
    },
	
	getContactById: function(id) {
		return this.contacts.get(id);
	},
    
    getContact: function(a, b) {
		var pair = this.contacts.find((Object.isFunction(a)) ? a : function(pair) {
			return pair.value[a] === b;
		});
		
		return (pair) ? pair.value : false;
    },
    
    hidePersonalInformation: function() {
        this.contacts.values().invoke("hidePersonalInformation");
        this.fireEvent("updated");
    },
    
    getClassMembers: function() {
        return this.contacts.findAll(function(pair) {
			return pair.value.classmember;
		}).pluck("value");
    },
    
    initialized: false
}))();

Contacts.View = Class.create(Controls.View, {
	initialize: function($super) {
		$super("Kontaktliste", new Sprite("smallIcons", 14), "Kontaktliste", { className: "contactView" });
		
		this.registerSubNode("profil", (function(state) {
				var contact = Contacts.getContact(function(pair) {
					return pair.value.getFlattenedFullName() === state.first();
				});
				
				if (contact) {
					return contact.showProfile();
				} else {
					return false;
				}
			}).bind(this), {
				rebuildOnStateChange: true
			}
		);
		
		this.on("activate", function() {
			if (!this.contactTable) {
				this.contactTable = this.content.insertControl(new Controls.Table({ keepHighlightedOnUpdate: "id" }));
				
				this.contactTable.on("sort", this._updateTitle, this);
				this.contactTable.on("highlightRow", this._onHighlightRow, this);
				this.contactTable.on("selectRow", function(contact) {
					this.reportNavigation("profil/" + contact.getFlattenedFullName());
				}, this);
				
				var processCell34 = function(a) {
					return a.replace("hidden", "<span class=\"hiddenInformation\">000 000 00 00</span>");
				};
				
				this.contactTable.addColumn("Name", function(a) {
						return a.getFullName();
					}, {
						width: "150px",
						sortable: true,
						allowReversedSorting: true
				});
				
				this.contactTable.addColumn("Nickname", "nickname", {
					width: "120px",
					sortable: true,
					allowReversedSorting: true
				});
				
				this.contactTable.addColumn("Telefon", "phone", {
					width: "100px",
					sortable: false,
					processCellContent: processCell34
				});
				
				this.contactTable.addColumn("Natel", "mobile", {
					width: "100px",
					sortable: false,
					processCellContent: processCell34
				});
				
				this.contactTable.addColumn("SF", "mainsubject", {
					width: "50px",
					sortable: true,
					showSortedInGroups: "outlookStyle",
					
					processGroupCaption: function(content) {
						return content.replace("PAM", "Physik und Anwendungen der Mathematik");
					}
				});
				
				this.contactTable.addColumn("Status", function(contact) {
					return contact.getState();
				}, {
					width: "75px",
					processCellContent: function(content) {
						return (content == "Offline") ? "" : content;
					}
				});
				
				this.sideMenu = new Controls.SideMenu(this, false);
				
				this.sideMenu.addItem("Profil anzeigen", new Sprite("fileTypesSmall", 0), (function() {
						this.reportNavigation("profil/" + this.contactTable.getHighlightedRow().getFlattenedFullName());
					}).bind(this), {
						abilityToDisable: true,
						iconDisabled: new Sprite("fileTypesSmall", 0),
						enable: false
				});
				
				this.sideMenu.addItem("E-Mail senden", new Sprite("smallIcons", 9), this.sendMailToOne.bind(this),   {
					abilityToDisable: true,
					iconDisabled: new Sprite("smallIcons", 10),
					enable: false
				});
				
				this.sideMenu.addItem("E-Mail an alle senden", new Sprite("smallIcons", 9), this.sendMailToAll.bind(this), {
					abilityToDisable: true,
					iconDisabled: new Sprite("smallIcons", 10),
					signedInOnly: true
				});
				
				this.sideMenu.setHelpText("Hier findest du die Kontakt-<br />informationen unserer Klasse. " +
					"<span style=\"display: none;\">Mit einem Doppelklick auf eine Person öffnest du ihr Profil.</span>" +
					"<br /><br /><span class=\"notSignedIn\"" + 
					((User.signedIn) ? " style=\"display: none;\"" : "") + ">" + "Um eine E-Mail an eine einzelne " +
					"Person oder gleich alle zu senden, musst du dich zuerst anmelden.</span><span class=\"signedIn\"" + 
					((User.signedIn) ? "" : " style=\"display: none;\"") + ">Du kannst auch eine E-Mail an eine " +
					"einzelne Person oder gleich alle in der Klasse senden.</span>");
				
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
		this.sendMailTo(Contacts.contacts.findAll(function(contact) {
			return (contact.classmember && contact.mail !== "hidden");
		}).pluck("mail"));
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
		switch (this.state) {
			case User.StateDetection.AWAY: return "Abwesend";
			case User.StateDetection.ONLINE: return "Online";
			default: return "Offline";
		}
	}
});

Contacts.Contact.Window = Class.create(Controls.Window, {
	initialize: function($super, contact) {
		var title = "Profil von " + (contact.nickname || contact.getFullName());
		
		if (!$super("ContactWindow", { onlyAllowOne: true, title: title })) {
			return;
		}
		
		var row = new Template("<tr><td class=\"caption\">#{caption}:</td><td>#{content}</td></tr>");
		
		var totalComments = Contacts.contacts.values().pluck("posts").inject(0, function(acc, n) { return acc + n; });
		
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