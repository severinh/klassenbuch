function() {
	var _cleanClassName = function(str) {
		return str.replace(/ /g, "-").toLowerCase();
	};
	
	var _baseHREF = function() {
		var href = document.location.href;
		
		if (href.include("?")) { // Remove the query string
			href = href.substring(0, href.indexOf("?"));
		}
		
		return href.substring(0, href.lastIndexOf("/")) + "/";
	}();
	
	var _isElement = function(el, tag) {
		if (el && el.tagName && (el.tagName.toLowerCase() === tag)) {
			return true;
		}
		
		if (el && el.getAttribute && (el.getAttribute("tag") === tag)) {
			return true;
		}
		
		return false;
	};
	
	Controls.Editor = Class.create(Control, {
		initialize: function($super, element, options) {
			$super(element);
			this.setOptions(options);
			
			this.container = new Element("div");
			this.editorWrapper = this.container.createChild({ className: "first-child" }).createChild();
			
			this._lastButton = null;
			this._lastImage = null;
			this._lastImageLoaded = false;
			this._nodeChangeTimer = null;
			this._lastNodeChangeEvent = null;
			this._lastNodeChange = 0;
			this._rendered = false;
			this._selection = null;
			this._mask = null;
			this._showingHiddenElements = null;
			this._contentTimer = null;
			this._contentTimerCounter = 0;
			this._disabled = ["createlink", "forecolor", "backcolor", "fontname", "fontsize", "superscript", "subscript", "removeformat", "heading", "indent"];
			this._alwaysDisabled = { "outdent": true };
			this._alwaysEnabled = { hiddenelements: true };
			this._semantic: { "bold": true, "italic": true, "underline": true };
			this._tag2cmd: {
				"b": "bold",
				"strong": "bold",
				"i": "italic",
				"em": "italic",
				"u": "underline",
				"sup": "superscript",
				"sub": "subscript",
				"img": "insertimage",
				"a": "createlink",
				"ul": "insertunorderedlist",
				"ol": "insertorderedlist"
			};
			
			this.currentWindow = null;
			this.currentEvent = null;
			this.operaEvent = null;
			this.currentFont = null;
			this.currentElement = [];
			this.dompath = null;
			this.beforeElement = null;
			this.afterElement = null;
			this.invalidHTML = {
				form: true,
				input: true,
				button: true,
				select: true,
				link: true,
				html: true,
				body: true,
				script: true,
				style: true,
				textarea: true
			};
			
			this.toolbar = null;
		},
		
        _createIframe: function() {
			return new Element("iframe", { 
				id: this.id + "_editor",
				src: (Prototype.Browser.IE) ? "about:blank" : "javascript:;"
			}).setStyle({
                border: 0,
                frameBorder: 0,
                marginWidth: 0,
                marginHeight: 0,
                leftMargin: 0,
                topMargin: 0,
                allowTransparency: true,
                width: "100%",
                zIndex: -1
            });
        },
        
		_getDoc: function() {
			var window = this._getWindow();
			
			if (window && window.document) {
				return window.document;
			}
            
            return false;
        },
        
        _getWindow: function() {
			if (this.iFrame && this.iFrame.contentWindow) {
				return this.iFrame.contentWindow;
			}
			
			return false;
        },
        
        _focusWindow: function(onLoad) {
            if (Prototype.Browser.WebKit) {
                if (onLoad) {
					// HAY
                    this._getSelection().setBaseAndExtent(this._getDoc().body.firstChild, 0, this._getDoc().body.firstChild, 1);
                    
                    if (this.browser.webkit3) {
                        this._getSelection().collapseToStart();
                    } else {
                        this._getSelection().collapse(false);
                    }
                } else {
					// HAY
                    this._getSelection().setBaseAndExtent(this._getDoc().body, 1, this._getDoc().body, 1);
                    
                    if (this.browser.webkit3) {
                        this._getSelection().collapseToStart();
                    } else {
                        this._getSelection().collapse(false);
                    }
                }
            }
            
            this._getWindow().focus();
        },
        
        _hasSelection: function() {
            var sel = this._getSelection();
            var range = this._getRange();
            var hasSel = false;
			
            // Internet Explorer
            if (Prototype.Browser.IE || Prototype.Browser.Opera) {
                if (range.text || range.html) {
                    hasSel = true;
                }
            } else {
                if (Prototype.Browser.WebKit) {
                    if (sel + "" !== "") {
                        hasSel = true;
                    }
                } else {
                    if (sel && (sel.toString() !== "") && (Object.isDefined(sel))) {
                        hasSel = true;
                    }
                }
            }
            
            return hasSel;
        },
        
        _getSelection: function() {
            var _sel = null;
            
            if (this._getDoc()) {
                _sel = (this._getDoc().selection) ? this._getDoc().selection : this._getWindow().getSelection();
				
                // Handle Safari's lack of Selection Object
                if (Prototype.Browser.WebKit) {
                    if (_sel.baseNode) {
						this._selection = {
							baseNode: _sel.baseNode,
							baseOffset: _sel.baseOffset,
							extentNode: _sel.extentNode,
							extentOffset: _sel.extentOffset
						};
                    } else if (!Object.isNull(this._selection)) {
                        _sel = this._getWindow().getSelection();
                        
                        // HAY
                        _sel.setBaseAndExtent(
                            this._selection.baseNode,
                            this._selection.baseOffset,
                            this._selection.extentNode,
                            this._selection.extentOffset);
                        
                        this._selection = null;
                    }
                }
            }
            
            return _sel;
        },
        
        _selectNode: function(node) {
            if (!node) {
                return false;
            }
            
            var sel = this._getSelection();
            var range = null;

            if (Prototype.Browser.IE) {
                try { // IE freaks out here sometimes..
                    range = this.getDoc().body.createTextRange();
                    range.moveToElementText(node);
                    range.select();
                } catch (e) { }
            } else if (Prototype.Browser.WebKit) {
				// HAY
				sel.setBaseAndExtent(node, 0, node, node.innerText.length);
            } else {
                range = this._getDoc().createRange();
                range.selectNodeContents(node);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        },
        
        _getRange: function() {
            var sel = this._getSelection();
			
            if (Object.isNull(sel)) {
                return null;
            }
			
            if (Prototype.Browser.WebKit && !sel.getRangeAt) {
                var _range = this._getDoc().createRange();
                
                try {
                    _range.setStart(sel.anchorNode, sel.anchorOffset);
                    _range.setEnd(sel.focusNode, sel.focusOffset);
                } catch (e) {
                    _range = this._getWindow().getSelection() + "";
                }
                
                return _range;
            }
			
            if (Prototype.Browser.IE || Prototype.Browser.Opera) {
                return sel.createRange();
            }
			
            if (sel.rangeCount > 0) {
                return sel.getRangeAt(0);
            }
            
            return null;
        },
        
        _setDesignMode: function(state) {
            try {
                this._getDoc().designMode = state;
            } catch(e) { }
        },
        
        _toggleDesignMode: function() {
            var _dMode = this._getDoc().designMode;
            var _state = "on";
            
            if (_dMode === "on") {
                _state = "off";
            }
            
            this._setDesignMode(_state);
            
            return _state;
        },
        
        _initEditor: function() {
            if (Prototype.Browser.IE) {
                this._getDoc().body.style.margin = "0";
            }
            
            this._setDesignMode("on");
            
            // HAY
            this.toolbar.on("buttonClick", this._handleToolbarClick, this, true);
            
            // Setup Listeners on iFrame
            var exdDoc = $(this._getDoc());
			
			exdDoc.observe("mouseup", this._handleMouseUp.bind(this));
			exdDoc.observe("mousedown", this._handleMouseDown.bind(this));
			exdDoc.observe("mouseclick", this._handleClick.bind(this));
			exdDoc.observe("mousedblclick", this._handleDoubleClick.bind(this));
			exdDoc.observe("mousekeypress", this._handleKeyPress.bind(this));
			exdDoc.observe("mousekeyup", this._handleKeyUp.bind(this));
			exdDoc.observe("mousekeydown", this._handleKeyDown.bind(this));
			
			// HAY
            this.toolbar.set('disabled', false);
            
            this.fireEvent("editorContentLoaded");
            
            if (this.dompath) {
				this._writeDomPath.bind(this).delay(150);
            }
			
            this.nodeChange(true);
            this._setBusy(true);
        },
        
        _checkLoaded: function() {
            this._contentTimerCounter++;
            
            if (this._contentTimer) {
                clearTimeout(this._contentTimer);
            }
            
            if (this._contentTimerCounter > 250) {
                return false;
            }
            
            var init = false;
            
            try {
                if (this._getDoc() && this._getDoc().body && (this._getDoc().body._rteLoaded === true)) {
                    init = true;
                }
            } catch (e) {
                init = false;
            }

            if (init === true) {
                // The onload event has fired, clean up after ourselves and fire the _initEditor method
                this._initEditor();
            } else {
                var self = this;
                this._contentTimer = setTimeout(function() {
                    self._checkLoaded.call(self);
                }, 20);
            }
        },
        
        _setInitialContent: function() {
			// HAY
			var html = new Template("").eval({
				title: this.STR_TITLE,
				content: this.element.value,
				css: this.css,
				hidden_css: this.hiddencss
			};
            
            var check = true;
            
            if (Prototype.Browser.IE || Prototype.Browser.Opera || Prototype.Browser.WebKit) {
                try {
                    this._getDoc().open();
                    this._getDoc().write(html);
                    this._getDoc().close();
                } catch (e) {
                    // Safari will only be here if we are hidden
                    check = false;
                }
            } else {
                // This keeps Firefox from writing the iframe to history preserving the back buttons functionality
                this.iFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(html);
            }
            
            if (check) {
                this._checkLoaded();
            }
        },
        
        _setMarkupType: function(action) {
            switch (this.markup) {
                case "css":
                    this._setEditorStyle(true);
                    break;
                case "default":
                    this._setEditorStyle(false);
                    break;
                case "semantic":
                case "xhtml":
					this._setEditorStyle(this._semantic[action]);
                    break;
            }
        },
        
        _setEditorStyle: function(stat) {
            try {
				// HAY
                this._getDoc().execCommand("useCSS", false, !stat);
            } catch (ex) { }
        },
        
        _getSelectedElement: function() {
            var doc = this._getDoc();
            var range = null;
            var sel = null;
            var elm = null;

            if (Prototype.Browser.IE) {
                this.currentEvent = this._getWindow().event; // Event utility assumes window.event, so we need to reset it to this._getWindow().event;
                range = this._getRange();
                
                if (range) {
                    elm = range.item ? range.item(0) : range.parentElement();
                    if (elm === doc.body) {
                        elm = null;
                    }
                }
                if (!Object.isNull(this.currentEvent) && this.currentEvent.keyCode === 0) {
                    elm = Event.getTarget(this.currentEvent);
                }
            } else {
                sel = this._getSelection();
                range = this._getRange();

                if (!sel || !range) {
                    return null;
                }
                
                if (!this._hasSelection() && !Prototype.Browser.WebKit) {
                    if (sel.anchorNode && (sel.anchorNode.nodeType == 3)) {
                        if (sel.anchorNode.parentNode) { // next check parentNode
                            elm = sel.anchorNode.parentNode;
                        }
                        
                        if (sel.anchorNode.nextSibling !== sel.focusNode.nextSibling) {
                            elm = sel.anchorNode.nextSibling;
                        }
                    }
                    
                    if (this._isElement(elm, "br")) {
                        elm = null;
                    }
                
                    if (!elm) {
                        elm = range.commonAncestorContainer;
                        
                        if (!range.collapsed) {
                            if (range.startContainer === range.endContainer) {
                                if (range.startOffset - range.endOffset < 2) {
                                    if (range.startContainer.hasChildNodes()) {
                                        elm = range.startContainer.childNodes[range.startOffset];
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            if (this.currentEvent !== null) {
                switch (this.currentEvent.type) {
                    case "click":
                    case "mousedown":
                    case "mouseup":
                        elm = Event.getTarget(this.currentEvent);
                        break;
                    default:
                        // Do nothing
                        break;
                }
            } else if (this.currentElement && this.currentElement[0]) {
                elm = this.currentElement[0];
            }

            if (this.browser.opera || this.browser.webkit) {
                if (this.currentEvent && !elm) {
                    elm = YAHOO.util.Event.getTarget(this.currentEvent);
                }
            }

            if (!elm || !elm.tagName) {
                elm = doc.body;
            }
            if (this._isElement(elm, 'html')) {
                //Safari sometimes gives us the HTML node back..
                elm = doc.body;
            }
            if (this._isElement(elm, 'body')) {
                //make sure that body means this body not the parent..
                elm = doc.body;
            }
            if (elm && !elm.parentNode) { //Not in document
                elm = doc.body;
            }
            if (elm === undefined) {
                elm = null;
            }
            return elm;
        },
	});
}();