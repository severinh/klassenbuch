/*
 * Software License Agreement (BSD License)
 * 
 * Copyright (c) 2006, Yahoo! Inc.
 * All rights reserved.
 * 
 * Redistribution and use of this software in source and binary forms, with or without modification, are
 * permitted provided that the following conditions are met:
 * 
 * * Redistributions of source code must retain the above
 *   copyright notice, this list of conditions and the
 *   following disclaimer.
 * 
 * * Redistributions in binary form must reproduce the above
 *   copyright notice, this list of conditions and the
 *   following disclaimer in the documentation and/or other
 *   materials provided with the distribution.
 * 
 * * Neither the name of Yahoo! Inc. nor the names of its
 *   contributors may be used to endorse or promote products
 *   derived from this software without specific prior
 *   written permission of Yahoo! Inc.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/**
 * @fileOverview Enthält die Funktionalität, die es es dem Benutzer ermöglicht, die Schaltflächen "Zurück" und "Weiter"
 * und die Lesezeichenfunktion seines Browsers zu verwenden.
*/

/**
 * Enthält die Funktionalität, die es es dem Benutzer ermöglicht, die Schaltflächen "Zurück" und "Weiter"
 * und die Lesezeichenfunktion seines Browsers zu verwenden. Damit wird ein oftgenannter und bedeutender Kritikpunkt
 * der Ajax-basierten Webentwicklung aus der Welt geschafft.
 * @class
 * @inherits EventPublisher
 * @static
 * @event start Wird ausgelöst, wenn die Klasse bereit ist und die Navigation des Benutzers verfolgt werden kann.
*/
App.History = function() {
	// Setzt Standardwerte für die privaten Eigenschaften
	
	/**
	 * Das versteckte IFrame, in dem die Browsing-Geschichte gespeichert wird. Dieses Element wird nur im Internet
	 * Explorer verwendet.
	 * @type HTMLIFrameElement
	 * @private
	 * @memberof App.History
	 * @name _iFrame
	*/
	var _iFrame = null;
	
	/**
	 * Ein Input-Element, das alle eine Liste aller Anfangszustände und gegenwärtigen Zuständen in einer
	 * Browser-Session enthält.
	 * @type HTMLInputElement
	 * @private
	 * @memberof App.History
	 * @name _storageField
	*/
	var _storageField = null;
	
	/**
	 * Gibt an, ob das Speicher-Feld <a href="#_storageField">App.History._storageField</a> bereit zur Verwendung ist.
	 * Standardwert ist <em>false</em>.
	 * @type Boolean
	 * @private
	 * @memberof App.History
	 * @name _storageFieldReady
	*/
	var _storageFieldReady = false;
	
	/**
	 * Enthält den Anfangszustand des Klassenbuchs. Dabei handelt es sich um den Wert des Parameters, das der
	 * Methode <a href="#start">start</a> übergeben wird.
	 * @type String
	 * @private
	 * @memberof App.History
	 * @name _initialState
	*/
	var _initialState = "";
	
	/**
	 * Enthält den gegenwärtigen Zustand des Klassenbuchs. Der Wert dieser privaten Eigenschaft kann mit der öffentlichen
	 * Methode <a href="#getCurrentState">getCurrentState</a> erhalten werden.
	 * @type String
	 * @private
	 * @memberof App.History
	 * @name _currentState
	*/
	var _currentState = "";
	
	/**
	 * Eine Liste aller Zustände. Wird nur vom Browser Safari verwendet.
	 * @type String[]
	 * @private
	 * @memberof App.History
	 * @name _states
	*/
	var _states = [];

	/**
	 * Diese private Eigenschaft ist dazu da, zu verhindern, dass sich beim Navigieren innerhalb des Klassenbuchs keine
	 * Endlosschleife ergibt. Wenn der Benutzer im Klassenbuch navigiert (z. B. die Ansicht wechselt), wird die
	 * Adressleiste des Browsers mit der Methode <a href="#navigate">navigate</a> entsprechend angepasst. Zugleich wird
	 * der Wert dieser privaten Eigenschaft auf <em>true</em> gesetzt. Da App.History nun erkennt, das der Inhalt der
	 * Adresszeile geändert hat, würde es normalerweise das Ereignis <em>statechange</em> auslösen, doch dies ist nicht
	 * nötig, da sich das Klassenbuch bereits in diesem "neuen" Zustand befindet. Nach einmaligem Verhindern dieses
	 * Ereignisses wird <em>_ignoreNextStateChange</em> wieder auf <em>false</em> gesetzt.
	 * @type Boolean
	 * @private
	 * @memberof App.History
	 * @name _ignoreNextStateChange
	*/
	var _ignoreNextStateChange = false;
	
	/**
	 * Gibt die Hash-Komponente der Adresse in der Addresszeile zurück, in der die anzuwendenden Modulzustände
	 * gespeichert sind. Als den Hash bezeichnet man die Daten nach dem Rautezeichen (#) in der Adressleiste.
	 * <br /><br />Im Grunde genommen bietet bereits location.hash Zugriff auf diese Daten, doch ist diese
	 * Eigenschaft auf Opera nicht sehr verlässlich, da beim Navigieren mit den Schaltflächen "Weiter" und "Zurück"
	 * teilweise location.hash nicht entsprechend angepasst wurde.
	 * @function
	 * @private
	 * @returns {String} Die Hash-Daten
	 * @memberof App.History
	 * @name _getHash
	*/
	var _getHash = function() {
		var href = top.location.href;
		var i = href.indexOf("#");
		
		return i >= 0 ? href.substr(i + 1) : null;
	};

	/**
	 * @function
	 * @private
	 * @returns {String}
	 * @memberof App.History
	 * @name _escapeString
	*/
	var _escapeString = function(str) {
		return String(str).replace(/([.*:+=?^!${}()|[\]\/\\])/g, '\\$1');
	};
	
	/**
	 * @function
	 * @private
	 * @returns {String}
	 * @memberof App.History
	 * @name _unescapeString
	*/
	var _unescapeString = function(str) {
		return unescape(String(str));
	};
	
    /**
     * Speichert den Anfangszustand und gegenwärtigen Zustand aller registrierten Module. Unter Safari werden auch 
     * jeder einzelne Zustand, der mit der Anwendung in einer einzelnen Browser-Session aufgerufen wird, gespeichert.
     * Die Speicherung findet in einem unsichtbaren Eingabefeld statt (<a href="#_storageField">_storageField</a>).
	 * @function
     * @memberof App.History
	 * @name _storeStates
     */
	var _storeStates = function() {
		_storageField.value = _initialState + "|" + _currentState;
		
		// Betrifft nur Safari
		if (Prototype.Browser.WebKit) {
			_storageField.value += "|" + _states.join(",");
		}
	};
	
    /**
	 * @function
     * @param {String} state Der komplette Zustand
     * @memberof App.History
	 * @name _handleStateChange
     */
	var _handleStateChange = function(state) {
		if (!state) {
			_currentState = _initialState;
			
			if (!_ignoreNextStateChange) {
				_ignoreNextStateChange = false;
				App.History.fireEvent("statechange", _unescapeString(_currentState));
			}
			
			return;
		}
		
		if (state !== _currentState) {
			_currentState = state;
			
			if (!_ignoreNextStateChange) {
				_ignoreNextStateChange = false;
				App.History.fireEvent("statechange", _unescapeString(_currentState));
			}
		}
	};
	
    /**
     * Überprüft in regelmässigen Abständen, ob das unsichtbare IFrame-Element im Internet Explorer bereits verwendet
     * werden kann.
	 * @function
     * @memberof App.History
	 * @name _checkIFrameLoaded
     */
	var _checkIFrameLoaded = function() {
		if (!_iFrame.contentWindow || !_iFrame.contentWindow.document ) {
			// Alle 10 Millisekunden soll einmal überprüft werden.
			window.setTimeout(_checkIframeLoaded.bind(this), 10);
			
			return;
		}

        // Die folgende periodische Überprüfung stellt fest, ob im Hauptfenster navigiert wurde. Dies ist der Fall, wenn
        // der Benutzer auf die Schaltfläche "Zurück" oder "Weiter" klickt und dadurch App.History.navigate aufgerufen
        // wird.
		var doc = _iFrame.contentWindow.document;
		var elem = doc.getElementById("state");
		
        // Die Eigenschaft innerHTML kann nicht verwendet werden, da die Strings Zeichen wie "&" enthalten (diese würden
        // fälschlicherweise zu "&amp;"). In diesem Fall würde der Vergleich der Strings fehlschlagen.
		var state = elem ? elem.innerText : null;
		
		var periodicalCheck = new PeriodicalExecuter((function () {
			doc = _iFrame.contentWindow.document;
			elem = doc.getElementById("state");
			// Siehe oberer Kommentar
			var newstate = elem ? elem.innerText : null;
			
			if (newstate !== state) {
				state = newstate;
				_handleStateChange(state);
				
                // Damit der Status auch in ein Lesezeichen gespeichert werden kann, muss ein Teil der URL im
                // Hauptfenster angepasst werden. Da Internet Explorer verwendet wird, wird der Browser-Verlauf nicht
                // automatisch erneuert, wenn der Hash geändert wird (anders als bei den anderen Browsern).
				top.location.hash = state || _initialState;
				_storeStates();
			}
		}).bind(this), 0.05);
		
		App.History.fireEvent("start");
		App.History.started = true;
	};
	
	return new (Class.create(EventPublisher, /** @scope App.History.prototype */ {
		/**
		 * Gibt an, ob der Browser die Funktionen, die von App.History bereitgestellt werden, unterstützt.
		 * @type Boolean
		 * @memberof App.History
		 * @name browserSupported
		*/
		browserSupported: !Prototype.Browser.Opera,
		
		/**
		 * Gibt an, ob App.History bereit ist und die Navigation des Benutzers verfolgt. Standardwert ist <em>false</em>.
		 * @type Boolean
		 * @memberof App.History
		 * @name started
		*/
		started: false,
		
		/**
		 * Schliesst die Initialisierung von App.History ab. Die nötigen unsichtbaren Elemente werden erzeugt.
		 * Sobald diese Methode aufgerufen wird, können mit der Methode <a href="#register">register</a> keine 
		 * weiteren Module mehr eingetragen werden.
		 * @function
		 * @memberof App.History
		 * @name start
		*/
		start: function(initialState) {
			if (!this.browserSupported) {
				return false;
			}
			
			_initialState = initialState || "";
			_storageField = $(document.body).createChild({ tag: "input", type: "hidden" });
			
			// Der Inhalt des Speicherfeldes wird eingelesen.
			var parts = _storageField.value.split("|");
			
			if (parts.length > 1) {
				// Initial State
				_initialState = parts[0];
				
				// Current State
				_currentState = parts[1];
			}
			
			if (parts.length > 2) {
				_states = parts[2].split(",");
			}
			
			_storageFieldReady = true;
			
			if (Prototype.Browser.IE) {
				// Der Internet Explorer benötigt ein unsichtbares IFrame-Element (siehe _checkIFrameLoaded())
				_iFrame = $(document.body).createChild({
					tag: "iframe",
					src: "javascript:document.open();document.write('" + Date.getCurrentTimestamp() + "');document.close();",
					style: {
						position: "absolute"
					}
				}).hide();
				
				_checkIFrameLoaded();
			} else {
				// Im folgenden wird periodisch überprüft, ob im Hauptfenster navigiert wurde. Dies ist der Fall, wenn
				// der Benutzer auf die Schaltfläche "Zurück" oder "Weiter" klickt und dadurch App.History.navigate
				// aufgerufen wird.
				
				// Unter Safari 1.x und 2.0 gibt es nur eine Möglichkeit, die Weiter/Zurück-Klicks zu überwachen:
				// Nämlich durch die Beobachtung von history.length... Im Grunde genommen wird hier etwas ausgenutzt,
				// was man in Wirklichkeit als Bug bezeichnen könnte (history.length sollte eigentlich nicht ändern,
				// wenn im Browser-Verlauf nach vorne oder hinten gewechselt wird...). Deshalb wird in der Überprüfung
				// zuerst der Hash verglichen, den die Sache mit dem Hash soll in der nächsten Version korrigiert
				// sein. Auch wenn dieser Fehler schlussendlich behoben wird, wird also diese Überprüfung immer noch
				// funktionieren.
				var counter = history.length;
				
				// Unter Gecko-Browsern und Opera muss nur der Hash überwacht werden
				var hash = _getHash();
				
				var periodicalCheck = new PeriodicalExecuter(function() {
					var newHash = _getHash();
					var newCounter = history.length;
					
					if (newHash !== hash) {
						hash = newHash;
						counter = newCounter;
						_handleStateChange(hash);
						_storeStates();
					} else if (newCounter !== counter) {
						// In diesem Fall verwendet der Benutzer scheinbar Safari.
						hash = newHash;
						counter = newCounter;
						state = _states[counter - 1];
						_handleStateChange(state);
						_storeStates();
					}
				}, 0.05);
				
				this.fireEvent("start");
				this.started = true;
			}
		},
		
        /**
         * Gibt den gegenwärtigen Status eines bestimmten Moduls zurück.
		 * @function
         * @returns {String} Der gegenwärtige Status des Moduls
         * @memberof App.History
		 * @name getCurrentState
         */
		getCurrentState: function() {
			if (!_storageFieldReady) {
				throw new Error("App.History wurde noch nicht gestartet");
			}
			
			return _unescapeString(_currentState);
		},
		
        /**
		 * @function
         * @returns {String} 
         * @memberof App.History
		 * @name getBookmarkedState
         */
		getBookmarkedState: function() {
			return _unescapeString(top.location.hash.substr(1));
		},
		
		/**
		 * Mit dieser Methode kann ein neuer Eintrag im Browser-Verlauf angelegt werden.
		 * @function
		 * @param {String} state Die Zeichenfolge, welche den neuen Status des betreffenden Moduls wiedergibt
		 * @returns {Boolean} Gibt an, ob der neue Status korrekt zum Browser-Verlauf hinzugefügt worden ist
		 * @memberof App.History
		 * @name navigate
		*/
		navigate: function(state) {
			if (!Object.isString(state)) {
				throw new Error("Missing or invalid argument passed to App.History.navigate");
			}
			
			if (!App.History.started) {
				throw new Error("App.History wurde noch nicht gestartet");
			}
			
			if (Prototype.Browser.IE) {
				try {
					var doc = _iFrame.contentWindow.document;
					doc.open();
					doc.write("<html><body><div id=\"state\">" + state + "</div></body></html>");
					doc.close();
				} catch(e) {
					return false;
				}
			} else {
                // Bekannter Fehler in Safari 1.x und 2.0: Wenn Tabbedbrowsing verwendet wird, zeigt Safari ununterochen
                // ein Laden-Symbol im Reiter. In neueren WebKit-Versionen wurde dies scheinbar korrigiert. Um das
                // Problem zu umgehen, kann ein Formular versendet werden, dass auf das selbe Dokument zielt. Obwohl dies
                // unter Safari 1.x und 2.0 funktioniert, gibt es grössere Schwierigkeiten unter WebKit. Deshalb wird
                // dieses Problem hier nicht korrigiert. Nun liegt es an Apple, wann eine neue Safari-Version
                // veröffentlicht wird.
				top.location.hash = state;
				
				if (Prototype.Browser.WebKit) {
					_states[history.length] = state;
					_storeStates();
				}
			}
			
			return true;
		}
	}))();
}();

App.History.Node = Class.create({
	initializeHistoryNode: function() {
		this._subNodes = {};
		this._dynamicSubNode = null;
		this._activeSubNode = null;
		this._activeSubNodeName = "";
		this._currentState = "";
		
		this.on("subnodeready", function(node) {
			if (node && this._subNodes[node]) {
				this._subNodes[node].ready = true;
			}
		}, this);
	},
	
	registerSubNode: function(nodeName, enterFunct, options) {
		options = Object.extend({
			restrictedAccess: false,
			needsServerCommunication: false
		}, options || {});
		
		this._subNodes[nodeName] = {
			enter: enterFunct,
			restrictedAccess: options.restrictedAccess,
			needsServerCommunication: options.needsServerCommunication,
			ready: !options.needsServerCommunication
		};
	},
	
	registerDynamicSubNode: function(enterFunct, checkValidityFunct, options) {
		options = Object.extend({
			restrictedAccess: false,
			needsServerCommunication: false
		}, options || {});
		
		if (this._dynamicSubNode) {
			return false;
		} else {
			this._dynamicSubNode = {
				enter: enterFunct,
				checkValidity: checkValidityFunct,
				restrictedAccess: options.restrictedAccess,
				needsServerCommunication: options.needsServerCommunication,
				ready: !options.needsServerCommunication
			};
		}
		
		if (this._dynamicSubNode.needsServerCommunication) {
			this.on("dynamicsubnodeready", function() {
				this._dynamicSubNode.ready = true;
			}, this);
		}
	},
	
	_enterSubNode: function(nodeName, state) {
		if (nodeName) {
			var isDynamicSubNode = false;
			
			if (this._subNodes[nodeName]) {
				var subNode = this._subNodes[nodeName];
			} else {
				var subNode = this._dynamicSubNode;
				isDynamicSubNode = true;
			}
			
			if (subNode) {
				if (subNode.restrictedAccess && !User.signedIn) {
					return false;
				}
				
				this._leaveActiveSubNode();
				
				if (isDynamicSubNode) {
					this._activeSubNode = subNode.enter(nodeName, state);
				} else {
					this._activeSubNode = subNode.enter(state);
				}
				
				if (this._activeSubNode) {
					this._activeSubNodeName = nodeName;
					
					this._activeSubNode._handleStateChange(state);
					
					this._activeSubNode.on("leave", function() {
						this.reportNavigation(this._lastParams || "");
					}, this);
					
					this._activeSubNode.on("navigate", function(state) {
						this.reportNavigation(this._activeSubNodeName + "/" + state);
					}, this);
					
					this.fireEvent("enterSubNode");
					
					return true;
				} else {
					this._activeSubNode = null;
					return false;
				}
			}
		}
	},
	
	_leaveActiveSubNode: function() {
		if (this._activeSubNode) {
			this._activeSubNode.removeListenersByEventName("leave");
			this._activeSubNode.leave();
			this._activeSubNode = null;
			
			this._activeSubNodeName = "";
			
			this.fireEvent("leaveSubNode");
		}
	},
	
	leave: function() {
		this._currentState = "";
		this._leaveActiveSubNode();
		this.fireEvent("leave");
	},
	
	_handleStateChange: function(state) {
		var self = this;
		var changeParams = function(params) {
			self._leaveActiveSubNode();
			self._lastParams = $A(params).join("/");
			self.handleParamsChange(params);
		};
		
		state = (state || []).compact();
		
		if (this._currentState === state.join("/")) {
			return;
		}
		
		this._currentState = state.join("/");
		
		if (state.length >= 1) {
			var first = state.shift();
			
			if (first) {
				if (this._subNodes[first]) {
					if (this._subNodes[first].needsServerCommunication && !this._subNodes[first].ready) {
						this.on("subnodeready", function(nodeName) {
							if (nodeName === first) {
								this._enterSubNode(first, state);
							}
						}, this);
						
						return true;
					}
					
					if (this._activeSubNode && this._activeSubNodeName === first) {
						return this._activeSubNode._handleStateChange(state);
					}
					
					return this._enterSubNode(first, state);
				} else if (this._dynamicSubNode) {
					if (this._dynamicSubNode.needsServerCommunication && !this._dynamicSubNode.ready) {
						this.on("dynamicsubnodeready", function() {
							if (this._dynamicSubNode.checkValidity(first)) {
								this._enterSubNode(first, state);
							} else {
								changeParams(first);
							}
						}, this);
						
						return true;
					}
					
					if (this._dynamicSubNode.checkValidity(first)) {
						if (this._activeSubNode && this._activeSubNodeName === first) {
							return this._activeSubNode._handleStateChange(state);
						}
						
						return this._enterSubNode(first, state);
					}
				}
				
				return changeParams(first) !== false;
			}
		}
		
		return changeParams(state) !== false;
	},
	
	handleParamsChange: Prototype.K,
	
	reportNavigation: function(state) {
		if (this._currentState !== state) {
			if (this._handleStateChange((state || "").split("/")) !== false) {
				this.fireEvent("navigate", state);
			}
		}
	}
});

App.History.RootNode = Class.create(App.History.Node, {
	initializeHistoryNode: function(initialState) {
		var self = this;
		
		this._initialState = initialState;
		
		if (App.History.browserSupported) {
			App.History.on("statechange", function(state) {
				var parts = state.split("/");
				
				if (self._subNodes[parts[0]]) {
					self._handleStateChange(parts);
				}
			});
			
			this.on("navigate", function(state) {
				if (App.History.started) {
					App.History.navigate(state);
				}
			});
		}
		
		App.History.Node.prototype.initializeHistoryNode.call(this);
	},
	
	_handleStateChange: function(state) {
		App.History.Node.prototype._handleStateChange.call(this, (Object.isArray(state) && state.length) ? state : [this._initialState]);
	}
});