/**
 * @class Bietet Zugriff auf die Kontaktinformationen der Klassenmitglieder. Sensible Informationen werden erst vom Server
 * geladen, wenn der Benutzer sich anmeldet. Zudem werden diese lokalen Informationen wieder gelöscht, wenn der Benutzer
 * sich abmeldet. Die Kontaktliste liegt in Form eines Array vor, das Objekte vom Typ <em>Contacts.Contact</em> enthält. Diese
 * Klasse bietet zusätzlich bequeme Zugriffsfunktionen auf diese Daten. Die Klasse führt von Zeit zu Zeit automatisch eine
 * Aktualisierung der Daten durch, wobei die Serverantworten zusätzlich gecached werden.
 * @static
 * @event updated - Wird ausgelöst, wenn sich die Kontaktinformationen aktualisiert wurden.
*/
var Contacts = Object.extend(new EventPublisher(), {
    initialize: function() {
        if (!Contacts.initialized) {
            Contacts.periodicalUpdate = new PeriodicalExecuter(Contacts.update, 3200);
            
            var data = DirectData.get("contacts");
            
            if (data) {
				Contacts._updateSuccess(new JSONRPC.Response(data.result));
            }
            
            User.on("signIn", Contacts.update);
            User.on("signOut", Contacts.hidePersonalInformation);
            
            Contacts.initialized = true;
        }
    },
    
    update: function() {
		var request = new JSONRPC.Request("getcontacts", [], { onSuccess: Contacts._updateSuccess });
    },
    
    _updateSuccess: function(response) {
		Contacts.contacts.clear();
		
		response.result.each(function(contact) {
			Contacts.contacts.push(new Contacts.Contact(contact));
		});
		
		Contacts.fireEvent("updated");
    },

    getContact: {
        byId: function(id) {
            return Contacts._getContact("id", id);
        },
        
        byNickname: function(nickname) {
            return Contacts._getContact("nickname", nickname);
        },
        
        byFullName: function(fullName) {
            return Contacts._getContact(function(contact) {
				return contact.getFullName() == fullName;
			});
        }
    },
    
    _getContact: function(a, b) {
        return Contacts.contacts.find((Object.isFunction(a)) ? a : function(contact) {
			return contact[a] == b;
		});
    },
    
    hidePersonalInformation: function() {
        Contacts.contacts.invoke("hidePersonalInformation");
        Contacts.fireEvent("updated");
    },
    
    getClassMembers: function() {
        return Contacts.contacts.findAll(function(contact) {
			return contact.classmember;
		});
    },
    
    contacts: [],
    initialized: false
});

App.on("initialize", Contacts.initialize);

Contacts.View = Class.create(Controls.View, {
	initialize: function($super) {
		$super("Kontaktliste", new Sprite("smallIcons", 14), "Kontaktliste", { className: "contactView" });
		
		this.registerSubNode("profil", (function(state) {
				var contact = Contacts._getContact(function(contact) {
					return contact.getFlattenedFullName() === state.first();
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
		
		this.on("activate", ((function() {
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
				
				var h1 = User.on("signIn", function() {
					this.sideMenu.items[1][(this.contactTable.highlightedRowId) ? "enable" : "disable"]();
				}, this);
				
				var h2 = User.on("signOut", function() {
					this.sideMenu.items[1].disable();
				}, this);
				
				this.on("remove", function() {
					User.removeEventListeners(h1);
					User.removeEventListeners(h2);
				}, this);
				
				Contacts.on("updated", this.update, this);
				
				this.update();
			}
		}).bind(this)));
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
        Object.extend(this, contact);
        
        if (this.lastContact) {
			this.lastContact = new Date(this.lastContact * 1000);
        }
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
	}
});

Contacts.Contact.Window = Class.create(Controls.Window, {
	initialize: function($super, contact) {
		this.contact = contact;
		
		var title = "Profil von " + (this.contact.nickname || this.contact.getFullName());
		
		if (!$super("ContactWindow", { onlyAllowOne: true, title: title })) {
			return;
		}
		
		var row = new Template("<tr><td class=\"caption\">#{caption}:</td><td>#{content}</td></tr>");
		
		this.update("<h2>" + title + "</h2><h3>Kontaktinformationen</h3><table class=\"simpleList\">" +
			row.evaluate({ caption: "Name", content: "<strong>" + this.contact.getFullName() + "</strong>" }) + ((User.signedIn) ?
			row.evaluate({ caption: "Adresse", content: this.contact.getFullAddress() || "" }) +
			row.evaluate({ caption: "Telefon", content: this.contact.phone || "" }) +
			row.evaluate({ caption: "Natel", content: this.contact.mobile || "" }) +
			row.evaluate({ caption: "E-Mail", content: "<a href=\"mailto:" + this.contact.mail + "\">" + this.contact.mail + "</a>" }) : "") +
			"</table><h3>Sonstiges</h3><table class=\"simpleList\">" +
			row.evaluate({ caption: "Schwerpunktfach", content: this.contact.mainsubject }) +
			row.evaluate({ caption: "Anzahl Kommentare", content: this.contact.posts + " <small>(" + (Math.round(this.contact.posts * 10000 /
				Contacts.contacts.pluck("posts").inject(0, function(acc, n) { return acc + n; })) / 100) + "% aller Kommentare)</small>" }) +
			"</table>");
		
		this.show();
	}
});

App.on("initialize", function() { App.Menu.addTab(new Contacts.View()); });