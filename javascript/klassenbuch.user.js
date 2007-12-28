/**
 * Ermöglicht es dem Benutzer, sich an-, bzw. abzumelden und stellt zusätzlich Informationen und Funktionen den
 * angemeldeten Benutzer betreffend bereit.
 * @singleton
 * @inherits EventPublisher
 * @event signIn Wird ausgelöst, wenn sich der Benutzer erfolgreich angemeldet hat
 * @event signOut Wird ausgelöst, wenn sich der Benutzer abgemeldet hat
 */
var User = new (Class.create(EventPublisher, /** @scope User.prototype */ {
    /**
     * Gibt an, ob ein Benutzer angemeldet ist oder nicht. Standardwert ist <em>false</em>.
     * @type Boolean
     */
	signedIn: false,
	
    /**
     * Die interne ID des angemeldeten Benutzers. Wenn der Benutzer nicht angemeldet ist, enthält diese Eigenschaft den
     * Wert 0.
     * @type Integer
     */
	id: 0,
	
    /**
     * Der Nickname des angemeldeten Benutzers. Wenn der Benutzer nicht angemeldet ist, enthält diese Eigenschaft eine
     * leere Zeichenfolge.
     * @type String
     */
	nickname: "",
	
	/**
	 * Das Token des angmeldeten Benutzers. Dies ist eine 32 Zeichen umfassende zufällige Zeichenfolge, das bei der
	 * Authentifizierung des Benutzers eine Rollte spielt. Da diese Token standardmässig auch in Form eines Cookies 
	 * vorliegt, findet diese Eigenschaft nur Verwendung, falls Cookies vom Browser nicht unterstützt werden. Wenn der
	 * Benutzer nicht angemeldet ist, enthält diese Eigenschaft eine leere Zeichenfolge.
	 * @type String
	*/
	token: "",
	
	/**
     * Wenn der Benutzer angemeldet ist, befinden sich in diesem Feld verschiedene Informationen über ihn. Dazu gehören
     * beispielsweise sein Vor- und Nachname, Adresse, Telefonnummer usw.<br /><br />Folgende Eigenschaften hat dieses
     * Objekt: <ul><li>firstname (String)</li><li>surname (String)</li><li>mail (String)</li><li>address (String)</li><li>plz 
     * (Integer)</li><li>location (String)</li><li>phone (String)</li><li>mobile (String)</li><li>posts (Integer)</li>
     * <li>classmember (Boolean)</li><li>mainsubject (String)</li></ul>
     * @type Object
	 */
	profile: null,
	
	/**
	 * Wenn der Benutzer angemeldet ist, enthält dieses Feld die persönlichen Einstellungen des Benutzers. Ist der
	 * Wenn der Benutzer aber nicht angemeldet ist, enthält dieses Feld ein leeres Objekt. Da der Benutzer für
	 * verschiedene Einstellungen möglicherweise keine Angaben gemacht hat, sollte die Methode
	 * <a href="#getSetting">getSetting</a> verwendet werden, um den Wert einer bestimmten Einstellung zu erhalten,
	 * damit gegebenenfalls automatisch die Standardeinstellungen zurückgegeben werden.
	 * @type Object
	*/
	settings: new Hash(),
	
	isAdmin: false,
	
	/**
	 * Die Standardeinstellungen, die verwendet werden sollen, wenn der Benutzer nicht angemeldet ist bzw. er für
	 * eine bestimmte Einstellung nichts angegeben hat.
	 * @type Object
	*/
	standardSettings: $H({
		theme: "nonzero"
	}),
	
    /**
     * Fenster, mit dem sich der Benutzer beim Klassenbuch durch Eingabe seines Passworts anmelden kann.<br /><br />
     * <strong>Wichtig:</strong> Aus Performancegründen wird dieses Fenster erst erstellt, wenn der Benutzer auf den
     * <em>Anmelden</em>-Link klickt.
     * @type User.SignInWindow
    */
    signInWindow: null,
    
	/**
     * Initialisiert <a href="#User">User</a> beim Laden des Klassenbuchs.<br /><br />Dabei wird überprüft, ob der
     * Benutzer bereits vom Server identifiziert werden konnte (durch eine gültige Session-ID). Ist dies der Fall, wird
     * das Feld <a href="#User._autoSignedIn">User.autoSignedIn</a> auf <em>true</em> gesetzt und die Funktion 
     * <a href="#User._signInSuccess">User._signInSuccess</a> mit den vom Server übergegeben Daten aufgerufen.
	 */
	initialize: function($super) {
		$super()
		
		App.on("initialize", function() {
			User.StateDetection.initialize();
			var userData = DirectData.get("userdata");
			
			if (userData) {
				// Der Benutzer wurde bereits vom Server identifiziert
				this._signInSuccess(new JSONRPC.Response(userData.result));
			}
		}, this);
	},
	
	/**
     * Zeigt das Anmeldefenster an.<br /><br />Wenn das Fenster beim Aufruf dieser Methode noch nicht existiert, wird
     * dieses erstellt. Siehe auch <a href="#User.signInWindow">User.signInWindow</a>.
     */
	showSignInWindow: function() {
        // Prüft, ob das Anmeldefenster bereits existiert
		if (!this.signInWindow) {
			this.signInWindow = new User.SignInWindow();
			this.signInWindow.on("submit", this.signIn, this);
		}
		
		this.signInWindow.show();
	},
	
	/**
     * Sendet einen Nicknamen und ein Passwort an den Server, um den Benutzer anzumelden. Sobald die Antwort des Servers
     * eingetroffen ist, werden die Eingaben im Anmeldefenster gelöscht, sofern dieses existiert. Je nach dem, ob der
     * Benutzer erfolgreich angemeldet werden konnte oder nicht, wird entweder die Funktion <a href="#_signInSuccess">
     * User._signInSuccess</a> bzw. <a href="#User.signInFailure">User.signInFailure</a> aufgerufen.
     * @param {String} username Der Nickname.
     * @param {String} password Das Passwort.
     */
	signIn: function(username, password) {
        var request = new JSONRPC.Request("signin", [username, password], {
			onSuccess: this._signInSuccess.bind(this), // Im Erfolgsfall
			onFailure: this._signInFailure.bind(this) // Wenn ein Fehler aufgetreten ist
        });
	},
	
	/**
     * Diese Funktion wird aufgerufen, wenn der Benutzer erfolgreich beim Klassenbuch angemeldet werden konnte und
     * verarbeitet die vom Server gesendeten Benutzerdaten. Schliesslich löst sie noch das Ereignis <em>signIn</em> aus.
     * @param {JSONRPC.Response} response Die eingelesene Antwort des Servers. Die relevanten Information
     * (<em>userdata</em> und <em>sessionid</em>) befinden sich in der Eigenschaft <em>result</em>.
     * @private
     */
	_signInSuccess: function(response) {
        // Versteckt das Anmeldefenster, wenn diess bereits existiert
        if (this.signInWindow) {
            this.signInWindow.hide();
        }
        
        // Fügt die Benutzerdaten ein (darunter auch die Session-ID)
		this.signedIn = true;
		this.id = response.result.id;
		this.nickname = response.result.nickname;
		this.token = response.result.token;
		this.profile = response.result.profile;
		this.settings = this.standardSettings.merge($H(response.result.settings));
		this.isAdmin = response.result.isadmin;
		
		// Zeigt den Willkommenshinweis an
		$("welcomeMessage").innerHTML = "Hallo, " + this.nickname + "!";
		this.updateSignInElements();
		
        this.fireEvent("signIn");
	},
	
	/**
     * Diese Methode wird aufgerufen, wenn der Benutzer nicht beim Klassenbuch angemeldet wurde, beispielsweise weil das
     * eingegebene Passwort keine Benutzer in der Datenbank zugeordnet werden konnte.
     * @param {JSONRPC.Response} response Die eingelesene Antwort des Servers. Sie hat die beiden Eigenschaften 
     * <em>faultCode</em> und <em>faulString</em>, mit denen herausgefunden werden kann, was schief gelaufen ist.
	 * @private
     */
	_signInFailure: function(response) {
        // Wenn ein falsches Passwort eingegeben wird, wird die folgende Meldung ausgegeben, ansonsten eine Standardmeldung
        if (response.faultCode === JSONRPC.ERROR_CODE.AUTHENTICATION_FAILED) {
            alert("Anmelden fehlgeschlagen.\n\nBitte gib deinen Benutzernamen und dein Passwort noch einmal ein.\n" +
				"Achte dabei auch auf die Gross- und Kleinschreibung.");
        } else {
            response.standardErrorAlert();
        }
	},
	
	/**
     * Meldet den Benutzer vom Klassenbuch ab. Dabei wird eine Anfrage an den Server gesendet, um die aktuelle Sitzung
     * zu beenden und das Session-Cookie entfernt. Schliesslich löst die Methode noch das Ereignis <em>signOut</em> aus.
     * <br /><br /><strong>Achtung:</strong> Wenn der Benutzer automatisch angemeldet wurde (siehe
     * <a href="#User.initialize">User.initialize</a>), sind noch sensible Benutzerinformationen im HTML-Text enthalten.
     * Deshalb wird die Webseite neu geladen, um auch diese Informationen zu entfernen.
     */
	signOut: function() {
		// Abmelden ergibt nur dann einen Sinn, wenn der Benutzer auch wirklich angemeldet ist ;-)
        if (this.signedIn) {
			// Sendet eine Anfrage an den Server, um die serverseitige Session-Datei zu entfernen
            var request = new JSONRPC.Request("signout");
            
            // Entfernt alle Benutzerdaten
            this.signedIn = false;
            
			this.id = 0;
			this.nickname = "";
			this.token = "";
            this.profile = {};
            this.settings = this.standardSettings.clone();
            this.isAdmin = false;
            
            this.updateSignInElements();
			
			JSONRPC.CachedRequest.clearCache();
            
            this.fireEvent("signOut");
		}
	},
	
	/**
     * Ändert die lokal gespeicherten Benutzerdaten, ohne die Änderungen dem Server bekannt zu geben.<br /><br />
     * Dies kommt beispielsweise bei der Kommentarfunktion zum Einsatz, wenn der Benutzer einen neuen Kommentar schreibt.
     * Die Server-Datei, die den Kommentar einträgt, inkrementiert auch automatisch die Anzahl Kommentare des Benutzers
     * in der Datenbank. Damit die gesamten Benutzerinformationen - welche auch die Anzahl Kommentare des Benutzers enthalten
     * - nicht noch einmal vom Server angefordert werden müssen, erhöht die Kommentarfunktion die Anzahl Kommentare auf
     * lokaler Ebene selbstständig mit dieser Funktion.<br /><br />Die Funktion löst das Ereignis <em>updated</em> von
     * <em>Contacts</em> aus.
     * @param {Object} data Die einzufügenden Benutzerdaten
	 */
	updateLocalProfile: function(profileInformation) {
        Object.extend(this.profile, profileInformation);
		Object.extend(Contacts.get(this.id), this.profile);
		Contacts.fireEvent("updated");
	},
	
	/**
     * Diese Funktion versteckt alle Elemente mit der Klasse <em>notSignedIn</em> und macht alle Elemente mit der
     * Klasse <em>signedIn</em> sichtbar, wenn der Benutzer angemeldet ist, bzw. das genaue Gegenteil, wenn dies nicht
     * zutrifft. Diese Funktion wird beim An- und Abmelden des Benutzers aufgerufen.
     * @param {HTMLObject} element Das Element, in dem der Vorgang durchgeführt werden soll. Hat dieser Parameter keinen
     * Wert, wird das &lt;body&gt;-Element verwendet.
     */
	updateSignInElements: function(element) {
		element = $(element);
		var func = (element) ? element.select : $$;
		
		func(".signedIn").invoke((this.signedIn) ? "show" : "hide");
		func(".notSignedIn").invoke((this.signedIn) ? "hide" : "show");
	},
	
	showSettingsWindow: function() {
		var window = new User.SettingsWindow();
	},
	
	showRegisterWindow: function() {
		var window = new User.RegisterWindow();
	}
}))();

User.StateDetection = function() {
	var getTimestamp = Date.getCurrentTimestamp;
	
	var lastActivity = 0,
		currentState = 0,
		alreadyChecked = false,
		inactivityCheck = null,
		decreaseCheckFrequency = null;
	
	var handleActivity = function() {
		if (!alreadyChecked) {
			alreadyChecked = true;
			lastActivity = getTimestamp();
		}
		
		return true;
	};
	
	var update = function(state) {
		if (currentState !== state) {
			Contacts.get(User.id).state = state;
			Contacts.fireEvent("updated");
			
			new JSONRPC.Request("setuserstate", [state], {
				onFailure: Prototype.K,
				
				onComplete: function() {
					currentState = state;
				}
			});
		}
	};
	
	return {
		initialize: function() {
			User.on("signIn", function() {
				document.observe("mousemove", handleActivity);
				document.observe("keyup", handleActivity);
				
				if (!inactivityCheck) {
					inactivityCheck = new PeriodicalExecuter(function() {
						if (lastActivity < getTimestamp() - 30) {
							update(User.StateDetection.AWAY);
						} else {
							update(User.StateDetection.ONLINE);
						}
					}, 2.5);
				} else {
					inactivityCheck.enable();
				}
				
				if (!decreaseCheckFrequency) {
					decreaseCheckFrequency = new PeriodicalExecuter(function() {
						alreadyChecked = false;
					}, 1);
				} else {
					decreaseCheckFrequency.enable();
				}
				
				currentState = User.StateDetection.ONLINE;
				handleActivity();
			});
			
			User.on("signOut", function() {
				document.stopObserving("mousemove", handleActivity);
				document.stopObserving("keyup", handleActivity);
				
				inactivityCheck.disable();
				decreaseCheckFrequency.disable();
			});
		},
		
		getState: function() {
			return currentState;
		},
		
		OFFLINE: 0,
		AWAY: 1,
		ONLINE: 2
	};
}();

User.SignInWindow = Class.create(Controls.Window, {
	initialize: function($super) {
		if (!$super("SignInWindow", {
			onClickCloseButton: "hide",
			onlyAllowOne: true,
			dragAble: false,
			showTitleBar: false,
			centerOnScreen: false })) {
			return;
		}
		
		this.update("<h2>Anmelden</h2>");
		
		this._form = this.content.insertControl(new Controls.Form({ submitButtonText: "Anmelden" })).add(
			new Controls.Form.TextField({ caption: "Nickname", name: "nickname" }),
			new Controls.Form.TextField({ caption: "Passwort", name: "password", type: "password" })
		);
		
		this._form.on("submit", this._submit, this);
		
		this._passwordLink = this.content.insertControl(new Controls.Link("Passwort vergessen", (function() {
			var window = new User.PasswordRequestWindow();
			this.hide();
		}).bind(this)));
		
		this._registerLink = this.content.insertControl(new Controls.Link("Noch kein Konto?", (function() {
			User.showRegisterWindow();
			this.hide();
		}).bind(this)));
		
		this.registerChildControl(this._form, this._passwordLink, this._registerLink);
		
		this.on("show", this._form.reset, this._form);
		this.on("hide", this._form.reset, this._form);
		
		this.on("show", function() {
			this._form.focusFirstField();
		}, this);
	},
	
	_submit: function(input) {
		this.fireEvent("submit", input.nickname, input.password);
	}
});

User.PasswordRequestWindow = Class.create(Controls.Window, {
    initialize: function($super) {
		if (!$super("PasswordRequestWindow", {
			onlyAllowOne: true,
			dragAble: false,
			showTitleBar: false,
			centerOnScreen: false })) {
			return;
		}
		
		this.update("<h2>Neues Passwort anfordern</h2>" +
			"<p>Gib deinen Benutzernamen und ein neues Passwort nach Wahl ein. Du wirst daraufhin eine E-Mail mit " +
			"einem Link erhalten, mit dem du das neue Passwort bestätigen kannst.</p>");
		
		this._form = this.content.insertControl(new Controls.Form());
		
		this._form.add(
			new Controls.Form.TextField({ caption: "Nickname", name: "nickname" }),
			new Controls.Form.TextField({ caption: "Passwort", name: "password", type: "password" })
		);
		
		this.show();
		
		this._form.on("submit", this._submit, this);
		this._form.focusFirstField();
    },
    
    _submit: function(input) {
		var request = new JSONRPC.Request("requestpassword", [input.nickname, input.password], {
			onSuccess: this._success.bind(this),
			onComplete: this._form.reset.bind(this._form)
		});
    },
    
    _success: function() {
		this.update("<h2>Hat geklappt!</h2>" +
			"<p>Das neue Passwort wurde erfolgreich eingetragen. Rufe nun deine E-Mails ab und klicke auf den Link in " +
			"der Bestätigung-Mail, um das Passwort zu bestätigen. Wenn die E-Mail auch nach einigen Minuten nicht im " +
			"Posteingang erscheint, solltest du den Spam-Ordner überprüfen.</p>");
    }
});

User.PasswordChangeWindow = Class.create(Controls.Window, {
    initialize: function($super) {
		if (!$super("PasswordChangeWindow", {
			onlyAllowOne: true,
			showTitleBar: false })) {
			return;
		}
		
		this.update("<h2>Passwort ändern</h2>");
		
		this._form = this.content.insertControl(new Controls.Form({ submitButtonText: "Passwort ändern" }));
		
		this._form.add(
			new Controls.Form.TextField({
				caption: "Aktuelles Passwort",
				name: "currentpassword",
				type: "password"
			}),
			
			new Controls.Form.TextField({
				caption: "Neues Passwort",
				name: "newpassword",
				type: "password"
			}),
			
			new Controls.Form.TextField({
				caption: "Neues Passwort (nochmal)",
				name: "newpasswordrepeat",
				type: "password"
			})
		);
		
		this.show();
		
		this._form.on("submit", this._submit, this);
		this._form.focusFirstField();
    },
	
    _submit: function(input) {
		if (input.newpassword === input.newpasswordrepeat) {
			var request = new JSONRPC.Request("changepassword", [input.newpassword, input.currentpassword], {
				onSuccess: this._success.bind(this)
			});
		} else {
			this._form.fields.last().markAsInvalid("Die Passwörter stimmen nicht überein.");
		}
    },
    
    _success: function() {
        this.update("<h2>Hat geklappt</h2><p>Dein Passwort wurde geändert. Du kannst dieses Fenster nun schliessen.</p>");
    }
});

User.SettingsWindow = Class.create(Controls.Window, {
	initialize: function($super) {
		if (!$super("SettingsWindow", { onlyAllowOne: true, title: "Einstellungen" })) {
			return;
		}
		
		this._tabControl = this.content.insertControl(new Controls.TabControl());
		
		["Profile", "Theme"].each(function(caption) {
			this.registerChildControl(this._tabControl.addTab(new User.SettingsWindow[caption]()));
		}, this);
		
		var footer = this.content.createChild({ className: "footer" });
		
		this._cancelButton = footer.insertControl(new Controls.Button("Abbrechen", this.close.bind(this), {
			icon: new Sprite("smallIcons", 4)
		}));
		
		this._saveButton = footer.insertControl(new Controls.Button("Speichern", this.save.bind(this), {
			icon: new Sprite("smallIcons", 25)
		}));
		
		this._passwordLink = footer.insertControl(new Controls.Link("Passwort ändern", (function() {
			var window = new User.PasswordChangeWindow();
		}).bind(this)));
		
		this.registerChildControl(this._saveButton, this._cancelButton, this._passwordLink);
		
		this.on("remove", function() {
			App.Windows.closeAllOfType("PasswordChangeWindow");
		});
		
		this.show();
	},
	
	save: function() {
		var settings = new Hash();
		var error = false;
		
		this._tabControl.tabs.each(function(tab) {
			var input = tab._getSettings();
			
			if (input === false) {
				tab.activate();
				alert("Bitte überprüfe deine Eingaben.");
				error = true;
			} else {
				settings.update(input);
			}
		}, this);
		
		if (!error) {
			if (settings.values().length) {
				var request = new JSONRPC.Request("changeusersettings", [settings], {
					onSuccess: function() {
						User.settings.update(settings);
					}
				});
			}
			
			var self = this;
			
			if (Ajax.activeRequestCount) {
				Ajax.Responders.register({
					onComplete: function() {
						if (Ajax.activeRequestCount === 0) {
							self.close();
							Ajax.Responders.unregister(arguments.callee);
						}
					}
				});
			} else {
				this.close();
			}
		}
	}
});

User.SettingsWindow.Profile = Class.create(Controls.TabControl.TabPageWithButtonControl, {
	initialize: function($super) {
		$super("Profil", new Sprite("fileTypesSmall", 0));
		
		this.addClassName("profileTab");
		this.editMode = false;
		
		var data = [
			{ caption: "Vorname",	field: "firstname", content: User.profile.firstname, 	maxlength: 30 },
			{ caption: "Nachname",  field: "surname",  	content: User.profile.surname, 	 	maxlength: 30 },
			{ caption: "Strasse", 	field: "address",  	content: User.profile.address, 	 	maxlength: 30 },
			{ caption: "PLZ", 		field: "plz", 	   	content: User.profile.plz,			maxlength: 4  },
			{ caption: "Ort", 		field: "location", 	content: User.profile.location, 	maxlength: 30 },
			{ caption: "Telefon", 	field: "phone", 	content: User.profile.phone  || "", maxlength: 13 },
			{ caption: "Natel", 	field: "mobile", 	content: User.profile.mobile || "", maxlength: 13 },
			{ caption: "E-Mail", 	field: "mail", 		content: User.profile.mail   || "", maxlength: 50 }
		];
		
		var staticRow = new Template("<tr><td class=\"caption\">#{caption}:</td><td>#{content}</td></tr>");
		
		var editRow = new Template("<tr>" +
			"<td class=\"caption\">#{caption}:</td>" +
			"<td><input type=\"#{type}\" name=\"#{field}\" value=\"#{content}\" maxlength=\"#{maxlength}\" /></td>" +
			"<td class=\"error #{field}Error\"></td>" +
			"</tr>");
		
		this.element.insert("<h2>Profil</h2>");
		
		this._editProfileButton = this.element.insertControl(new Controls.Button("Profil verändern",
			this.editProfile.bind(this), {
				icon: new Sprite("smallIcons", 2)
			}
		));
		
		this._stopEditingProfileButton = this.element.insertControl(new Controls.Button("Nicht verändern",
			this.stopEditingProfile.bind(this), {
				icon: new Sprite("smallIcons", 4),
				visible: false
			}
		));
		
		this.element.insert("<table class=\"staticInformation\">" +
			data.collect(staticRow.evaluate, staticRow).join("") +
			"</table><form action=\"javascript:void(null);\" style=\"display: none;\"><table>" +
			data.collect(editRow.evaluate, editRow).join("") + 
			"</table></form>");
		
		this._form = this.select("form")[0];
		this._staticInformation = this.select(".staticInformation")[0];
		
		this.registerChildControl(this._editProfileButton, this._stopEditingProfileButton);
	},
	
	editProfile: function() {
		this._staticInformation.hide();
		this._form.show().focusFirstElement();
		this._editProfileButton.hide();
		this._stopEditingProfileButton.show();
		
		this.editMode = true;
	},
	
	stopEditingProfile: function() {
		this._form.hide();
		this._staticInformation.show();
		this._stopEditingProfileButton.hide();
		this._editProfileButton.show();
		
		this.editMode = false;
	},
	
	_getSettings: function() {
		if (this.editMode) {
			var input = this._form.serialize(true);
			var error = false;
			var errorIcon = (new Sprite("smallIcons", 20)).toHTML();
			
			var regExpPhone = /^(0\d{2} \d{3}( \d\d){2})|(0\d{9})|(\+[1-9]\d{10})$/;
			var regExpPLZ = /^[1-9]\d{3}$/;
			
			this._form.select(".error").invoke("update", "");
			
			var check = (function(field, test) {
				if ((Object.isString(test)) ? input[field][test]() : test) {
					this._form.select("." + field + "Error")[0].update(errorIcon);
					error = true;
				}
			}).bind(this);
			
			check("firstname", "blank");
			check("surname",   "blank");
			check("address",   "blank");
			check("plz",	   !regExpPLZ.test(input.plz));
			check("location",  "blank");
			check("phone",	   !(input.phone.blank()  || regExpPhone.test(input.phone)));
			check("mobile",	   !(input.mobile.blank() || regExpPhone.test(input.mobile)));
			check("mail",	   !input.mail.isValidMailAddress());
			
			if (error) {
				return false;
			}
			
			var request = new JSONRPC.Request("updateuserprofile", [input], {
				onSuccess: function(response) {
					User.updateLocalProfile(input);
				}
			});
		}
		
		return new Hash();
	}
});

User.SettingsWindow.Theme = Class.create(Controls.TabControl.TabPageWithButtonControl, {
	initialize: function($super) {
		$super("Design", new Sprite("fileTypesSmall", 4));
		
		this.addClassName("themeTab");
		this.element.innerHTML = "<h2>Design</h2>";
		
		App.ThemeManager.availableThemes.each(function(pair) {
			var el = this.element.createChild({ className: "theme", content: 
				"<img src=\"design/" + pair.key + "/preview.jpg\" /><div>" + pair.value +"</div>" });
			
			el.observe("click", this._selectTheme.bind(this, pair.key));
			
			this.on("remove", el.stopObserving, el);
		}, this);
		
		this.on("remove", function() {
			App.ThemeManager.setTheme(User.settings.theme);
		});
	},
	
	_getSettings: function() {
		return (this._selectedTheme) ? $H({ theme: this._selectedTheme }) : new Hash();
	},
	
	_selectTheme: function(theme) {
		this._selectedTheme = theme;
		App.ThemeManager.setTheme(theme);
	}
});

User.RegisterWindow = Class.create(Controls.Window, {
	initialize: function($super) {
		if (!$super("RegisterWindow", {
			onlyAllowOne: true,
			dragAble: false,
			showTitleBar: false,
			centerOnScreen: false })) {
			return;
		}
		
		this.update("<h2>Registrieren</h2>" +
			"<p>Wenn du noch kein Konto im Klassenbuch hast, kannst du dich hier registrieren.</p>");
		
		this._form = this.content.insertControl(new Controls.Form({ submitButtonText: "Registrieren" }));
		
		this._form.add(
			new Controls.Form.TextField({
				caption: "Nickname",
				name: "nickname",
				minLength: 4
			}),
			
			new Controls.Form.TextField({
				caption: "Vorname",
				name: "firstname"
			}),
			
			new Controls.Form.TextField({
				caption: "Nachname",
				name: "surname"
			}),
			
			new Controls.Form.TextField({
				caption: "E-Mail-Adresse",
				name: "mail",
				dataType: "mail"
			}),
			
			new Controls.Form.TextField({
				caption: "Passwort",
				name: "password",
				type: "password",
				minLength: 4
			}),
			
			new Controls.Form.TextField({
				caption: "Passwort (nochmal)",
				name: "passwordrepeat",
				type: "password",
				minLength: 4
			})
		);
		
		this.registerChildControl(this._form);
		
		this.show();
		
		this._form.on("submit", this._submit, this);
		this._form.focusFirstField();
	},
	
	_submit: function(input) {
		if (input.password === input.passwordrepeat) {
			var request = new JSONRPC.Request("registeruser",
				[input.nickname, input.firstname, input.surname, input.mail, input.password], {
					onSuccess: (function() {
						this.update("<h2>Hat geklappt!</h2>" +
							"<p>Du hast nun ein Konto im Klassenbuch und brauchst jetzt nur noch warten, bis dein Konto " +
							"von Severin aktiviert wird.</p>");
					}).bind(this)
				}
			);
		} else {
			this._form.fields.last().markAsInvalid("Die Passwörter stimmen nicht überein.");
		}
	}
});