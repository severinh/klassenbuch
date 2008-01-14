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

var Shoutbox = new (Class.create(JSONRPC.Store, {
	initialize: function($super) {
		var self = this;
		
		$super({
			method: "shoutbox_poll",
			params: function() {
				return [self.highestMessageID || 0];
			},
			periodicalUpdate: 10,
			appendOnly: true,
			suppressErrors: true
		});
		
		this.on("updated", function() {
			self.highestMessageID = self.max(function(message) {
				return message.id;
			});
		});
		
		App.on("initialize", function() {
			self.options.itemClass = Shoutbox.Message;
			
			User.on("signOut", function() {
				self.highestMessageID = 0;
				self.removeAll();
			});
		});
	}
}))();

Shoutbox.View = Class.create(Controls.View, {
	initialize: function($super) {
		$super("Shoutbox", new Sprite("smallIcons", 0), "Shoutbox", { className: "shoutboxView" });
		
		this.directlyAdded = [];
		
		this.contactStates = this.content.createChild({ className: "sidePane" }).observe("click", function(event) {
			var element = event.element();
			
			if (element && element.tagName === "A") {
				var contactId = element.readAttribute("name");
				
				Contacts.get(contactId).showProfile();
			}
		});
		
		this.settings = this.content.createChild({
			className: "sidePane",
			content: "<h3>Einstellungen</h3>" +
				"<input type=\"checkbox\" value=\"systemmessages\" " +
				(User.settings.get("chat_systemmessages") ? "checked=\"checked\"" : "") + " /> Systemmeldungen anzeigen"
		}).select("input")[0].observe("click", (function(event) {
			var element = event.element();
			var messages = this.messages;
			
			if (element.checked) {
				messages.select(".systemMessage").invoke("show");
				messages.select(".date").invoke("show");
			} else {
				messages.select(".systemMessage").invoke("hide");
				messages.select(".date").findAll(function(dateElement) {
					var nextElement = dateElement;
					
					do {
						nextElement = $(nextElement.nextSibling);
						
						if (!nextElement) {
							return true;
						}
						
						if (nextElement.hasClassName("message")) {
							if (nextElement.visible()) {
								return false;
							}
						} else {
							return true;
						}
					} while (true)
				}).invoke("hide");
			}
			
			var settings = { "chat_systemmessages": element.checked };
			
			new JSONRPC.Request("changeusersettings", [settings], {
				onSuccess: function() {
					User.settings.update(settings);
				}
			});
			
			this.messages.scrollToBottom();
		}).bindAsEventListener(this));
		
		var self = this;
		
		this.messages = this.content.createChild({ className: "messages" });
		this.registerChildControl(new Controls.AutoResizingControl(this.messages, { height: 290 }));
		
		this.messagesTable = this.messages.createChild({ tag: "table" });
		
		this.input = this.content.createChild({ tag: "textarea" }).observe("keydown", function(event) {
			var keyCode = event.keyCode,
				shiftPressed = false;
			
			if (keyCode == Event.KEY_RETURN) {
				shiftPressed = event.shiftKey;
			} else {
				return true;
			}
			
			if (shiftPressed) {
				return true;
			} else {
				self.send(this.getValue());
				event.stop();
				
				(function() {
					event.element().value = "";
				}).defer()
			}
		});
		
		this.submitButton = this.content.insertControl(new Controls.Button("Senden", this.send.bind(this)));
		
		var setPollFrequency = function(frequency) {
			if (Shoutbox.periodicalUpdate) {
				Shoutbox.periodicalUpdate.setFrequency(frequency);
			}
		};
		
		this._onExternalEvent(Contacts, "updated", function() {
			if (User.signedIn) {
				var state = Contacts.get(User.id).state;
				
				if (this.active) {
					if (state === User.StateDetection.ONLINE) {
						setPollFrequency(1.5);
					} else {
						setPollFrequency(10);
					}
				}
				
				this.updateContactList();
			} else {
				if (Shoutbox.periodicalUpdate) {
					Shoutbox.periodicalUpdate.disable();
				}
			}
		}, this);
		
		this.on("activate", function() {
			setPollFrequency(1.5);
			App.LoadingIndicator.deactivate();
			
			self.messages.scrollToBottom();
		});
		
		this.on("deactivate", function() {
			setPollFrequency(10);
			App.LoadingIndicator.activate();
		});
		
		this._onExternalEvent(Shoutbox, "updated", function(newMessages) {
			if (newMessages.length) {
				self.addMessages(newMessages);
			}
		});
		
		if (!Shoutbox.loaded) {
			Shoutbox.load();
		} else {
			this.addMessages(Shoutbox);
		}
		
		this.updateContactList();
	},
	
	updateContactList: function() {
		var away = [];
		var online = Contacts.findAll(function(contact) {
			if (contact.state === User.StateDetection.AWAY) {
				away.push(contact);
				return;
			}
			
			return contact.state === User.StateDetection.ONLINE;
		});
		
		var getHTML = function(contact) {
			return "<li><a href=\"javascript:void(null);\" name=\"" + contact.id + "\">" + contact.nickname + "</a></li>";
		};
		
		this.contactStates.innerHTML = (online.length
			? "<h3>Online</h3><ul>" + online.collect(getHTML).join("") + "</ul>" : "") + (away.length
			? "<h3>Abwesend</h3><ul>" + away.collect(getHTML).join("") + "</ul>" : "");
	},
	
	send: function(message) {
		message = message.stripScripts().stripTags().strip().replace(/(\r?\n)+/g, "[BR /]");
		
		if (message) {
			var request = new JSONRPC.Request("shoutbox_say", [message, Shoutbox.highestMessageID || 0]);
			
			this.input.value = "";
			this.addMessage({ userid: User.id, date: new Date(), text: message });
			this.directlyAdded.push(message);
		}
	},
	
	addMessages: function(messages) {
		var self = this,
			showSystemMessages = User.settings.get("chat_systemmessages");
		
		this.messagesTable.insert(messages.collect(function(message) {
			if (!self.directlyAdded.include(message.text)) {
				var ownMessage = message.userid === User.id,
					nickname = Contacts.get(message.userid).nickname,
					sameUser = self.lastMessage && self.lastMessage.userid == message.userid,
					clonedDate = message.date.removeTime(true),
					newDate = !self.lastDate || !clonedDate.equals(self.lastDate.removeTime(true)),
					html = "",
					hours = message.date.getHours(),
					minutes = (message.date.getMinutes() / 5).floor() * 5,
					newTime = true,
					hide = !showSystemMessages && message.system ? " style=\"display: none;\"" : "";
				
				clonedDate.setHours(hours);
				clonedDate.setMinutes(minutes);
				
				if (self.lastDate) {
					newTime = !clonedDate.equals(self.lastDate);
				}
				
				if (newTime) {
					html += "<tr class=\"date unselectable\"" + hide + ">" +
						"<td class=\"left\">" + (newDate ? message.date.format("j. F") : "&nbsp;") + "</td>" +
						"<td class=\"right\">" + hours.toPaddedString(2) + ":" + minutes.toPaddedString(2) + "</td></tr>";
				}
				
				html += "<tr class=\"message " + (message.system ? "systemMessage" : ownMessage ? "ownMessage" : "") + "\"" + hide + ">" +
					"<td class=\"left author unselectable\">" + (!sameUser || self.lastMessage.system !== message.system ||
					newTime ? nickname : "" ) + "</td>" +
					"<td class=\"right text\">" + Emoticons.parse(BBCode.parse(message.text)) + "</td></tr>";
				
				self.lastMessage = message;	
				self.lastDate = clonedDate;
				
				return html;
			}
			
			self.directlyAdded = [];
		}).join(""));
		
		this.messages.scrollToBottom();
	},
	
	addMessage: function(message) {
		this.addMessages([message]);
	}
});

Shoutbox.Message = Class.create({
	initialize: function(message) {
		this.update(message);
	},
	
	update: function(message) {
		Object.extend(this, message);
		
		this.date = Date.fromTimestamp(message.date);
	}
});

User.standardSettings.set("chat_systemmessages", true);

App.on("initialize", function() {
	var inserted = false;
	var addTab = function() {
		if (!inserted) {
			App.Menu.addTab(new Shoutbox.View());
			inserted = true;
		}
	};
	
	if (User.signedIn) {
		addTab();
	}
	
	User.on("signIn", addTab);
	User.on("signOut", function() {
		if (inserted) {
			var tab = App.Menu.getTab("Shoutbox");
			
			if (tab.active) {
				App.Menu.reportNavigation("fotogalerie");
			}
			
			App.Menu.removeTab(tab);
			inserted = false;
		}
	});
});