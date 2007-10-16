var Comments = {};

Comments.MainWindow = Class.create(Controls.Window, {
	initialize: function($super, task, options) {
		this.task = task;
		this.comments = [];
		this.setOptions({ commentsPerPage: 15 }, options);
		
		var title = "Kommentare zur Aufgabe \"" + this.task.text.truncate(50) + "\"";
		
		if (!$super("TaskCommentsWindow", { title: title })) {
			return;
        }
        
        this.registerSubNode("neuerkommentar", (function() {
				if (this.task.date.getTimestamp() >= CalendarDate.getCurrentTimestamp()) {
					var createWindow = new Comments.CreateCommentWindow(this.task.id);
					createWindow.on("success", this._createCommentSuccess, this);
					
					return createWindow;
				} else {
					(function() {
						this.reportNavigation("");
						alert("Aufgaben in der Vergangenheit können leider nicht mehr kommentiert werden.");
					}).bind(this).defer();
					
					return false;
				}
			}).bind(this), {
				restrictedAccess: true
			}
		);
		
		this.registerDynamicSubNode(
			(function(nodeName, state) {
				return this.comments.find(function(comment) {
					return comment.id === parseInt(nodeName, 10);
				});
			}).bind(this),
			
			(function(nodeName) {
				return this.comments.pluck("id").include(parseInt(nodeName, 10));
			}).bind(this),
			
			{ needsServerCommunication: true }
		);
		
		Comments.Comment.Control.on("showprofile", function(comment) {
			this.reportNavigation(comment.id + "/profil");
		}, this);
		
		Comments.Comment.Control.on("edit", function(comment) {
			this.reportNavigation(comment.id + "/bearbeiten");
		}, this);
        
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
			this.commentsContainer.scrollToTop();
		}, this);
		
		this.registerChildControl(this.newCommentButton, this.tabControl);
		
		this.periodicalUpdate = new PeriodicalExecuter(this.getComments.bind(this), 120);
		
		this.on("remove", function() {
			this.periodicalUpdate.disable();
		}, this);
		
		this.getComments();
		this.show();
	},
	
	getComments: function() {
        var request = new JSONRPC.Request("getcomments", [this.task.id], { onSuccess: this._getCommentsSuccess.bind(this) });
	},
	
	_getCommentsSuccess: function(response) {
		if (!App.Windows.hasWindowOfType("CommentWindowAbstract")) {
            this.tabControl.removeAllTabs();
            
            this.task.comments = response.result.length;
            var initialCommunication = !(this.comments.length);
            
            if (this.task.comments > 0) {
                this.comments = response.result.collect(function(comment) {
					return new Comments.Comment(comment);
				}, this);
				
                this.comments.eachSlice(this.options.commentsPerPage).each(function(groupOfComments) {
					this._addTab().addComments(groupOfComments);
				}, this);
            } else {
				this._addTab();
            }
            
            this.loadingComments.hide();
            this._updateNumberOfComments();
            
            if (initialCommunication) {
				this.fireEvent("dynamicsubnodeready");
            }
        }
	},
	
	_addTab: function() {
        var tab = this.tabControl.addTab(new Comments.MainWindow.TabPage(this.tabControl.tabs.length + 1));
		
        if (this.tabControl.tabs.length === 2) {
            this.tabControl.show();
        }
        
        return tab;
	},
	
	_updateNumberOfComments: function() {
		var a = "";
		
        switch (this.task.comments) {
			case 0:  a = "Keine Kommentare"; break;
			case 1:  a = "Ein Kommentar"; break;
			default: a = this.task.comments + " Kommentare"; break;
		}
		
        this.numberOfComments.innerHTML = a;
	},
	
	_createCommentSuccess: function(comment) {
        if (this.tabControl.tabs.last().comments.length === this.options.commentsPerPage) {
            this._addTab();
        }
        
        this.comments.push(comment);
        this.tabControl.activateTab(this.tabControl.tabs.length - 1);
        this.tabControl.tabs.last().addComment(comment);
        this.task.comments++;
        this._updateNumberOfComments();
        this.commentsContainer.scrollToBottom();
        
        this.fireEvent("createComment");
    }
});

Comments.Emoticons = $H({
    angry:    ["*angry*"],
    biggrin:  [":-D", ":D", "=D"],
    blink:    ["o.O", "oO", "o_O"],
    blush:    ["*blush*", ":-*)"],
    cool:     ["B-)", "B)", "8-D", "8D"],
    dry:      ["-.-", "- . -"],
    excl:     ["*excl*"],
    happy:    ["^^"],
    huh:      ["*huh*"],
    laugh:    ["lol"],
    mellow:   ["*mellow*", ":-|"],
    ohmy:     [":-o", ":o"],
    rolleyes: ["*rolleyes*"],
    sad:      [":-(", ":(", "=("],
    sleep:    ["-_-"],
    tongue:   [":-P", ":P"],
    unsure:   ["*unsure*", ":-/"],
    wink:     [";-)", ";)"],
    lol:	  ["xD", "XD"]
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
	
	var emoticonsHTML =	Comments.Emoticons.collect(function(pair) {
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
				
				this.on("remove", function() { el.stopObserving("click"); });
			}, this);
			
			this.inputArea = this.select(".inputArea")[0];
		},
		
		getInput: function() {
			return this.inputArea.value.stripScripts().stripTags().replaceAll("\r\n", "[BR /]").replaceAll("\n", "[BR /]");
		},
		
		setInput: function(input) {
			var self = this;
			
			(function() {
				self.inputArea.value = input.replaceAll("[BR /]", "\n");
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
				this.insertTag(Comments.Emoticons.get(fileName)[0], "");
			}
		}
	});
}();

Comments.Comment = Class.create(EventPublisher, App.History.Node.prototype, {
	initialize: function($super, comment) {
		$super();
		
		this.id = comment.id;
		this.taskid = comment.taskid;
		this.userid = comment.userid;
		this.text = comment.text;
		this.date = new Date(comment.date * 1000);
		
		this.contact = Contacts.getContact.byId(this.userid);
		
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
});

Comments.Comment.Control = Class.create(Control, {
	initialize: function($super, comment) {
		this.comment = comment;
		
		$super(new Element("div", { className: "comment" }));
		
		this.element.innerHTML = "<div class=\"profile\"></div><div class=\"commands\">" +
			new Sprite("smallIcons", 2).toHTML("editButton") + "</div><div class=\"content\"></div>" +
			"<div class=\"date\">" + ((this.comment.date.isToday()) ? "Heute," : ((this.comment.date.wasYesterday()) ? 
			"Gestern," : this.comment.date.format("d.m.Y"))) + " " +  this.comment.date.format("H:i") + "</div>";
		
		var _profile = this.select(".profile")[0];
		
		this.registerChildControl(_profile.insertControl(new Controls.Link(this.comment.contact.nickname, (function() {
			Comments.Comment.Control.fireEvent("showprofile", this.comment);
		}).bind(this))));
		
		this._posts = _profile.createChild({ content: "Beiträge: " + this.comment.contact.posts });
		
		this._editButton = this.select(".editButton")[0];
        
        if (this.comment.userid === User.id && User.signedIn) {
			this._editButton.observe("click", (function() {
				Comments.Comment.Control.fireEvent("edit", this.comment);
			}).bind(this));
			
			this.on("remove", this._editButton.stopObserving, this._editButton);
        } else {
			this._editButton.hide();
        }
		
		this._content = this.select(".content")[0];
		this.refreshControl();
		
		this._onExternalEvent(Contacts, "updated", function() {
			this._posts.innerHTML = "Beiträge: " + this.comment.contact.posts;
		}, this);
		
		var h2 = this.comment.on("edit", this.refreshControl, this);
		
		this.on("remove", function() {
			this.comment.removeListener(h2);
		}, this);
	},

	refreshControl: function() {
        var comment = this.comment.text.replaceAll("[BR /]", "<br />");
        
        [["B", "strong"], ["I", "em"], ["U", "u"]].each(function(a) {
            if (comment.count("[" + a[0] + "]") === comment.count("[/" + a[0] + "]")) {
                comment = comment.replaceAll("[" + a[0] + "]", "<" + a[1] + ">").replaceAll("[/" + a[0] + "]", "</" + a[1] + ">");
            }
         });
		
        Comments.Emoticons.each(function(pair) {
			pair.value.each(function(e) {
				comment = comment.replaceAll(e, "<img src=\"images/emoticons/" + pair.key + ".gif\" style=\"vertical-align: middle;\" />");
			}); 
		});
		
		this._content.innerHTML = comment;
	}
});

Object.extend(Comments.Comment.Control, new EventPublisher());