var Comments = {};

Comments.MainWindow = Class.create(Controls.Window, {
	initialize: function($super, task, options) {
		this.task = task;
		this.comments = task.comments;
		
		this.setOptions({ commentsPerPage: 15 }, options);
		
		var title = "Kommentare zur Aufgabe \"" + this.task.text.truncate(50) + "\"",
			self = this;
		
		if (!$super("TaskCommentsWindow", { title: title })) {
			return;
        }
        
        this.registerSubNode("neuerkommentar", function() {
				if (task.date.getTimestamp() >= Date.getTodaysTimestamp()) {
					var createWindow = new Comments.CreateCommentWindow(task.id);
					createWindow.on("success", self._createCommentSuccess, self);
					
					return createWindow;
				}
				
				alert("Aufgaben in der Vergangenheit können leider nicht mehr kommentiert werden.");
				return false;
			}, {
				restrictedAccess: true
			}
		);
		
		this.registerDynamicSubNode(
			function(nodeName, state) {
				return self.comments.get(parseInt(nodeName));
			},
			
			function(nodeName) {
				return !!self.comments.get(parseInt(nodeName));
			},
			
			{ needsServerCommunication: !this.comments.loaded }
		);
		
		this._onExternalEvent(Comments.Comment.Control, "showprofile", function(comment) {
			self.reportNavigation(comment.id + "/profil");
		});
		
		this._onExternalEvent(Comments.Comment.Control, "edit", function(comment) {
			self.reportNavigation(comment.id + "/bearbeiten");
		});
        
		this.update("<h2>" + title + "</h2>");
		
		this.newCommentButton = this.content.insertControl(new Controls.Button("Neuer Kommentar",
			this.reportNavigation.bind(this, "neuerkommentar"), {
				icon: new Sprite("smallIcons", 6),
				iconDisabled: new Sprite("smallIcons", 7),
				onlySignedIn: true,
				className: "newCommentButton"
			}
		));
		
		this.commentsContainer = this.content.createChild({ className: "commentsContainer" });
		this.numberOfComments = this.content.createChild({ className: "numberOfComments" });
		this.loadingComments = this.content.createChild({ className: "loadingComments", content: "Die Kommentare werden geladen..." });
        
		this.tabControl = this.content.insertControl(new Controls.TabControl(this.commentsContainer));
		this.tabControl.addClassName("commentTabsContainer");
		this.tabControl.hide();
		
		this.tabControl.on("activateTab", function() {
			self.commentsContainer.scrollToTop();
		});
		
		this.registerChildControl(this.newCommentButton, this.tabControl);
		
		this._onExternalEvent(this.comments, "updated", this._insertComments, this);
		
		this.show();
		
		if (this.comments.loaded) {
			this._insertComments();
		} else if (!this.comments.loading) {
			this.comments.load();
		}
		
		this.on("remove", function() {
			self.comments.periodicalUpdate.disable();
		});
		
		this.comments.enablePeriodicalUpdate();
	},
	
	_insertComments: function() {
		this.tabControl.removeAllTabs();
		
		if (this.comments.count() > 0) {
			this.comments.eachSlice(this.options.commentsPerPage).each(function(groupOfComments) {
				this._addTab().addComments(groupOfComments);
			}, this);
		} else {
			this._addTab();
		}
		
		this.loadingComments.hide();
		this._updateNumberOfComments();
		
		this.fireEvent("dynamicsubnodeready");
	},
	
	_addTab: function() {
        var tab = this.tabControl.addTab(new Comments.MainWindow.TabPage(this.tabControl.tabs.length + 1));
		
        if (this.tabControl.tabs.length === 2) {
            this.tabControl.show();
        }
        
        return tab;
	},
	
	_updateNumberOfComments: function() {
		var a = "",
			commentsCount = this.comments.count();
		
        switch (commentsCount) {
			case 0:  a = "Keine Kommentare"; break;
			case 1:  a = "Ein Kommentar"; break;
			default: a = commentsCount + " Kommentare"; break;
		}
		
        this.numberOfComments.innerHTML = a;
	},
	
	_createCommentSuccess: function(comment) {
        if (this.tabControl.tabs.last().comments.length === this.options.commentsPerPage) {
            this._addTab();
        }
        
        this.comments.add(comment);
        this.tabControl.activateTab(this.tabControl.tabs.length - 1);
        this.tabControl.tabs.last().addComment(comment);
        this._updateNumberOfComments();
        this.commentsContainer.scrollToBottom();
        
        this.fireEvent("createComment");
    }
});

Comments.MainWindow.TabPage = Class.create(Controls.TabControl.TabPage, {
	initialize: function($super, caption) {
		$super(caption);
		
		this.comments = [];
		
		this.on("activate", function() {
			if (this._childControls.length === 0) {
				this.comments.each(this._createCommentControl, this);
			}
		}, this);
	},
	
	_createTabElement: function($super) {
		$super();
		
		this.on("activate", function() {
			this.tabElement.addClassName("active");
		}, this);
		
		this.on("deactivate", function() {
			this.tabElement.removeClassName("active");
		}, this);
	},
	
	_createCommentControl: function(comment) {
		this.registerChildControl(this.element.insertControl(comment.getControl()));
	},
	
	addComment: function(comment) {
		this.comments.push(comment);
		
        if (this.active) {
			this._createCommentControl(comment);
        }
	},
	
	addComments: function(comments) {
        comments.each(this.addComment, this);
	}
});

Comments.CommentWindowAbstract = Class.create(Controls.Window, {
    initialize: function($super, title) {
        if (!$super("CommentWindowAbstract", { title: title, onlyAllowOne: true })) {
			return;
        }
        
        this.update("<h2>" + title + "</h2>");
        
        this._inputField = this.content.insertControl(new Comments.CommentInputField(this.inputContainer));
        this.buttonContainer = this.content.createChild({ className: "buttonContainer" });
        this.cancelButton = this.buttonContainer.insertControl(new Controls.Button("Abbrechen", this.close.bind(this), { icon: new Sprite("smallIcons", 4) }));
        this.submitButton = this.buttonContainer.insertControl(new Controls.Button("<strong>Kommentar speichern</strong>", this.submit.bind(this), { icon: new Sprite("smallIcons", 25) }));
        
        this.registerChildControl(this._inputField, this.cancelButton, this.submitButton);
        this.show();
        
        return true;
    },
    
    _validateInput: function() {
        var input = this._inputField.getInput();
        
        if (!input.length) {
            alert("Bitte gib einen Kommentar ein.");
        }
        
        return input;
    }
});

Comments.CreateCommentWindow = Class.create(Comments.CommentWindowAbstract, {
    initialize: function($super, taskid, initialContent) {
        if (!$super("Neuer Kommentar")) {
			return;
		}
        
        this.taskid = taskid;
        
        if (initialContent) {
            this._inputField.setInput("[QUOTE]" + initialContent + "[/QUOTE]");
        }
    },
    
    submit: function() {
        var input = this._validateInput();
        
        if (input) {
            var request = new JSONRPC.Request("createcomment", [this.taskid, input], {
				onSuccess: this._success.bind(this),
				onComplete: (function() {
					this.submitButton.enable();
				}).bind(this)
			});
			
			this.submitButton.disable();
        }
    },
    
    _success: function(response) {
		User.updateLocalProfile({ posts: User.profile.posts + 1 });
		
        this.fireEvent("success", new Comments.Comment({
			id: response.result,
			taskid: this.taskid,
			userid: User.id,
			text: this._inputField.getInput(),
			date: Date.getCurrentTimestamp()
		}));
		
        this.close();
    }
});

Comments.EditCommentWindow = Class.create(Comments.CommentWindowAbstract, {
    initialize: function($super, comment) {
        if (!$super("Kommentar bearbeiten")) {
			return;
        }
        
        this.comment = comment;
        this._inputField.setInput(this.comment.text);
    },
    
    submit: function() {
        var input = this._validateInput();
        
        if (input) {
            var request = new JSONRPC.Request("editcomment", [this.comment.id, input], {
				onSuccess: this._success.bind(this),
				onComplete: (function() {
					this.submitButton.enable();
				}).bind(this)
			});
			
			this.submitButton.disable();
        }
    },
    
    _success: function(response) {
		var text = this._inputField.getInput();
		
		this.comment.text = text;
        this.fireEvent("success", text);
        this.close();
    }
});

Comments.CommentInputField = function() {
	var formatingHTML =	["B", "I", "U"].collect(function(f) {
		return "<img src=\"images/formatting/" + f.toLowerCase() + ".gif\" name=\"" + f + "\" />";
	}).join("");
	
	var emoticonsHTML =	BBCode.Emoticons.collect(function(pair) {
		return "<img src=\"images/emoticons/" + pair.key + ".gif\" name=\"" + pair.key + "\" />";
	}).join("");
	
	var html = "<div class=\"formatingContainer\">" + formatingHTML + "</div>" +
		"<textarea class=\"inputArea\"></textarea>" +
		"<div class=\"emoticonsContainer\">" + emoticonsHTML + "</div>";
	
	return Class.create(Control, {
		initialize: function($super) {
			$super(new Element("div", { className: "commentInputField" }));
			
			this.element.innerHTML = html;
			
			$H({ formatingContainer: "_formatText", emoticonsContainer: "_insertEmoticon" }).each(function(pair) {
				var el = this.select("." + pair.key)[0].observe("click", this[pair.value].bindAsEventListener(this));
				
				this.on("remove", function() {
					el.stopObserving("click");
				});
			}, this);
			
			this.inputArea = this.select(".inputArea")[0];
		},
		
		getInput: function() {
			return this.inputArea.value.stripScripts().stripTags().replace(/\r?\n/g, "[BR /]");
		},
		
		setInput: function(input) {
			var self = this;
			
			(function() {
				self.inputArea.value = input.replace(/\[BR \/\]/g, "\n");
			}).defer();
		},
		
		insertTag: function(aTag, eTag) {
			this.inputArea.focus();
			
			if (Object.isDefined(document.selection)) {
				var range = document.selection.createRange();
				var selectedText = range.text;
				range.text = aTag + selectedText + eTag;
				
				range = document.selection.createRange();
				
				if (selectedText.length === 0) {
					range.move("character", -eTag.length);
				} else {
					range.moveStart("character", aTag.length + selectedText.length + eTag.length);
				}
				
				range.select();
			} else if (Object.isDefined(this.inputArea.selectionStart)) {
				var start = this.inputArea.selectionStart;
				var end = this.inputArea.selectionEnd;
				var selectedText = this.inputArea.value.substring(start, end);
				this.inputArea.value = this.inputArea.value.substr(0, start) + aTag + selectedText + eTag + this.inputArea.value.substr(end);
				
				var position = start + ((selectedText.length === 0) ? aTag.length : aTag.length + selectedText.length + eTag.length);
				
				this.inputArea.selectionStart = position;
				this.inputArea.selectionEnd = position;
			}
		},
		
		_formatText: function(e) {
			var format = Event.element(e).name;
		
			if (format) {
				this.insertTag("[" + format + "]", "[/" + format + "]");
			}
		},
		
		_insertEmoticon: function(e) {
			var fileName = Event.element(e).name;
			
			if (fileName) {
				this.insertTag(BBCode.Emoticons.get(fileName)[0], "");
			}
		}
	});
}();

Comments.Comment = Class.create({
	initialize: function(comment) {
		this.id = comment.id;
		this.update(comment);
		
		this.contact = Contacts.get(this.userid);
		
		this.initializeHistoryNode();
		
		this.registerSubNode("bearbeiten", this.edit.bind(this), {
			restrictedAccess: true
		});
		
		this.registerSubNode("profil", (function() {
			var profileWindow = this.contact.showProfile();
			profileWindow.on("leave", this.leave, this);
			
			return profileWindow;
		}).bind(this));
	},
	
	update: function(comment) {
		this.taskid = comment.taskid;
		this.userid = comment.userid;
		this.text = comment.text;
		this.date = new Date(comment.date * 1000);
	},
	
	edit: function() {
		if (this.userid === User.id) {
			var editWindow = new Comments.EditCommentWindow(this);
			
			editWindow.on("success", this.fireEvent.bind(this, "edit", this.text));
			editWindow.on("leave", this.leave, this);
			
			return editWindow;
		} else {
			return false;
		}
	},
	
	getControl: function() {
		return new Comments.Comment.Control(this);
	}
}).addMethods(Observable).addMethods(App.History.Node);

Comments.Comment.Control = function() {
	var editButtonHTML = new Sprite("smallIcons", 2).toHTML("editButton");
	
	return Class.create(Control, {
		initialize: function($super, comment) {
			this.comment = comment;
			
			$super(new Element("div", { className: "comment" }));
			
			this.element.innerHTML = "<div class=\"profile\"><div><a class=\"profileLink\" href=\"javascript:void(null);\">" +
				this.comment.contact.nickname + "</a></div><div class=\"profileExtract\"></div></div>" +
				"<div class=\"commands\">" + editButtonHTML + "</div><div class=\"content\"></div><div class=\"date\">" + 
				((this.comment.date.isToday()) ? "Heute," : ((this.comment.date.wasYesterday()) ? "Gestern," : 
				this.comment.date.format("d.m.Y"))) + " " + this.comment.date.format("H:i") + "</div>";
			
			this.element.observe("click", (function(event) {
				var element = event.element();
				
				if (element.hasClassName("editButton")) {
					Comments.Comment.Control.fireEvent("edit", this.comment);
				} else if (element.hasClassName("profileLink")) {
					Comments.Comment.Control.fireEvent("showprofile", this.comment);
				}
			}).bindAsEventListener(this));
			
			if (!(User.signedIn && this.comment.userid === User.id)) {
				this.select(".editButton")[0].hide();
			}
			
			this._content = this.select(".content")[0];
			this._onExternalEvent(this.comment, "edit", this.refreshControl, this);
			
			this.refreshControl();

			var _refreshProfileInformation = (function() {
				if (!this._profileExtract) {
					this._profileExtract = this.select(".profileExtract")[0];
				}
				
				this._profileExtract.innerHTML = "Beiträge: " + this.comment.contact.posts + "<br />" +
					"Status: " + this.comment.contact.getState();
			}).bind(this);

			this._onExternalEvent(Contacts, "updated", _refreshProfileInformation);
			_refreshProfileInformation();
		},
		
		refreshControl: function() {
			this._content.innerHTML = BBCode.parse(this.comment.text);
		}
	});
}();

Object.extend(Comments.Comment.Control, Observable);
