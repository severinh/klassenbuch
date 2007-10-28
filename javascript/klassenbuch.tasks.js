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

/**
 * @fileOverview Enthält alles, was mit der Aufgabenverwaltung in Verbindung steht (ausser die Kommentarfunktion).
*/

/**
 * Hauptklasse dieser Datei, die Zugriff auf eine Aufgabenliste (enthält alle anstehenden Aufgaben und Aufgaben in den
 * letzten 30 Tagen) bietet und zudem die Möglichkeit, neue Aufgaben hinzuzufügen. Sie dient zudem als eine Art
 * Namensraum für alles, was mit der Aufgabenverwaltung im Klassenbuch in Verbindung steht. Des Weiteren enthält sie
 * eine Auflistung aller Schulfächer zusammen mit ihren Abkürzungen und eine Funktion, um bequem alle anstehenden Aufgaben
 * zu erhalten.
 * @class
 * @static
 * @inherits EventPublisher
*/
var TaskManagement = new (Class.create(EventPublisher, /** @scope TaskManagement.prototype */ {
	/**
	 * Initialisiert die Aufgabenverwaltung beim Start des Klassenbuchs. Um sich einen weiteren Aufruf des Servers zu
	 * ersparen, wird die Aufgabenliste bereits mit der Datei index.php mitübertragen. Diese Daten werden mit dieser
	 * Funktion in die Aufgabenverwaltung eingefügt. Zudem wird noch die automatische Aktualisierung eingerichtet und
	 * definiert, was beim An- oder Abmelden des Benutzers passieren soll.
	 * @memberof TaskManagement
	*/
	initialize: function($super) {
		$super();
		
		var init = (function() {
			if (!this.initialized) {
				var data = DirectData.get("tasks");
				
				if (data) {
					this._updateSuccess(new JSONRPC.Response(data.result));
				}
				
				/**
				 * Bewirkt, dass ungefähr jede Viertelstunde eine Anfrage an den Server gesendet wird, um die Aufgabenliste zu
				 * aktualisieren.
				 * @type PeriodicalExecuter
				 * @memberof TaskManagement
				 * @name periodicalUpdate
				*/
				this.periodicalUpdate = new PeriodicalExecuter(this.update.bind(this), 1000);
				
				// Meldet sich der Benutzer an, wird die Aufgabenliste erneut vom Server abgerufen, da sie nun nauch Informationen
				// darüber enthält, ob es bei bestimmten Aufgaben ungelesene Kommentare gibt.
				User.on("signIn", this.update, this);
				
				// Meldet sich der Benutzer ab, wird bei jeder Aufgabe die Eigenschaft newComments auf <em>false</em>
				// gesetzt, und das Ereignis <em>updated</em> ausgelöst. Dies erspart eine weitere Anfrage an den Server.
				User.on("signOut", function() {
					this.Tasks.each(function(task) {
						task.newComments = false;
					});
					
					this.fireEvent("updated");
				}, this);
				
				this.initialized = true;
			}
		}).bind(this);
		
		if (App.initialized) {
			init();
		} else {
			App.on("initialize", init);
		}
	},
	
	/**
	 * Zeigt ein Fenster zum Eintragen einer Aufgabe an
	 * (<a href="TaskManagement.TaskCreationWindow.htm">TaskManagement.TaskCreationWindow</a>. Wenn der Benutzer 
	 * erfolgreich eine Aufgabe eingetragen hat, wird diese der Aufgabenliste hinzugefügt, wodurch die Aufgabenliste nicht
	 * noch einmal vom Server angefordert werden muss. Zudem wird das Ereignis 'updated' ausgelöst.
	 * @returns {TaskManagement.TaskCreationWindow} Das Fenster zum Eintragen der Aufgabe.
	 * @memberof TaskManagement
	*/
	createTask: function() {
		var createWindow = new TaskManagement.TaskCreationWindow();
		
		createWindow.on("created", function(task) {
			this._addTask(task);
			this.fireEvent("updated");
		}, this);
		
		return createWindow;
	},

	/**
	 * Fordert die Aufgabenliste vom Server an. Gibt der Server eine gültige Antwort zurück, wird die Funktion
	 * <a href="TaskManagement.htm#_updateSuccess">TaskManagement._updateSuccess</a> aufgerufen, mit der die
	 * Aufgabenliste
	 * @memberof TaskManagement
	*/
	update: function() {
		var request = new JSONRPC.Request("gettasks", [Date.getTodaysTimestamp() - 2592000], {
			onSuccess: this._updateSuccess.bind(this)
		});
	},

	/**
	 * Gibt alle Aufgaben in einem bestimmten Zeitrahmen zurück.
	 * @param {Number} startTimestamp Der Linuxzeitstempel für die untere Datumsgrenze.
	 * @param {Number} endTimestamp (optional) Der Linuxzeitstempel für die obere Datumsgrenze.
	 * @return {Task[]} Die Aufgaben.
	 * @memberof TaskManagement
	*/	
	getTasksWithinTimeRange: function(startTimestamp, endTimestamp) {
		return this.Tasks.findAll(function(task) {
			if (endTimestamp) {
				return $R(startTimestamp, endTimestamp).include(task.date.getTimestamp());
			} else {
				return task.date.getTimestamp() >= startTimestamp;
			}
		});
	},

	/**
	 * Gibt alle anstehenden Aufgaben zurück. Dazu zählen auch die Aufgaben, die heute fällig sind.
	 * @return {Task[]} Die anstehenden Aufgaben.
	 * @memberof TaskManagement
	*/
	getUpcomingTasks: function() {
		return this.getTasksWithinTimeRange(Date.getTodaysTimestamp());
	},

	/**
	 * Verarbeitet die vom Server erhaltene Aufgabenliste. Diese Methode entfernt alle bestehenden Aufgaben aus der
	 * Aufgabenliste und fügt die vom Server erhaltenen Daten ein.<br /><br />Beispiel für eine Server-Antwort:
	 * <pre class="code">
{
	result: [{
		id: 62,
		date: 1181512800,
		subject: "Wirtschaft und Recht",
		important: true,
		text: "Probe Buchhaltung",
		userid: 1,
		added: 1181470470,
		removed: false,
		comments: 4,
		newcomments: false
	}],
	error: null
}
	 * </pre>
	 * @param {JSONRPC.Response} response Die Antwort des Servers.
	 * @memberof TaskManagement
	*/	
	_updateSuccess: function(response) {
        if (!(App.Windows.hasWindowOfType("CreateEditTaskWindow") || App.Windows.hasWindowOfType("TaskCommentsWindow"))) {
			this.Tasks.clear();
			
			response.result.each(function(taskInformation) {
				this._addTask(new TaskManagement.Task(taskInformation));
			}, this);
			
			this.fireEvent("updated");
        }
	},

    /**
     * Interne Funktion, mit der eine Aufgabe zur lokalen Kopie der Aufgabenliste
     * (<a href="TaskManagement.htm#Tasks">TaskManagement.Tasks</a>) hinzugefügt wird. Dieser Umweg ist nötig, damit korrekt erkannt
     * wird, wenn die Aufgabe vom Benutzer bearbeitet wird und dadurch Ereignis <em>updated</em> von
     * <em>TaskManagement</em> ausgelöst werden kann.
     * @param {TaskManagement.Task} task Die hinzuzufügende Aufgabe
     * @private
     * @memberof TaskManagement
    */
	_addTask: function(task) {
		task.on("change", this.fireEvent.bind(this, "updated"));
		this.Tasks.push(task);		
	},
	
	/**
	 * Eine Auflistung aller Fächer, die in der Aufgabenverwaltung gewählt werden können.
	 * @type String[]
	 * @name subjects
	 * @memberof TaskManagement
	 * @todo Sollte schon auf Server-Seite angegeben werden können, beispielsweise in einer Datenbanktabelle. Dies
	 * würde auch die Menge der übertragenen Daten beim Abfragen der Aufgabenliste reduzieren.
	*/
	subjects: [
		"Anwendungen der Mathematik",
		"Bildnerisches Gestalten",
		"Biologie",
		"Chemie (Ergänzungsfach)", 
		"Deutsch",
		"Englisch",
		"Französisch",
		"Geschichte",
		"Italienisch",
		"Lateinisch",
		"Mathematik", 
		"Musik (Schwerpunktfach)",
		"Musik (Grundlagenfach)",
		"Physik (Schwerpunktfach)",
		"Physik (Grundlagenfach)",
		"Religion (Ergänzungsfach)",
		"Sonstiges",
		"Sport",
		"Wirtschaft und Recht (Ergänzungsfach)"
	],

	/**
	 * Eine Auflistung aller Fächer, die in der Aufgabenverwaltung gewählt werden können; in abgekürzter Form.
	 * @type String[]
	 * @name subjectsShort
	 * @memberof TaskManagement
	*/	
	subjectsShort: [
		"AM",
		"BG",
		"Biologie",
		"Chemie (EF)",
		"Deutsch",
		"Englisch",
		"Französisch",
		"Geschichte",
		"Italienisch",
		"Lateinisch",
		"Mathematik",
		"Musik (SF)",
		"Musik (GF)",
		"Physik (SF)", 
		"Physik (GF)",
		"Religion (EF)",
		"Sonstiges",
		"Sport",
		"WR (EF)"
	],

	/**
	 * Enthält eine Auflistung aller anstehenden Aufgaben und aller Aufgaben der letzten 30 Tage. Die Methoden
	 * <a href="#getTasksWithinTimeRange">getTasksWithinTimeRange</a> und 
	 * <a href="#getUpcomingTasks">getUpcomingTasks</a> bieten einen bequemen Zugriff auf die Aufgaben.
	 * @type TaskManagement.Task[]
	 * @name Tasks
	 * @memberof TaskManagement
	*/
	Tasks: [],
	
	/**
	 * Gibt an, ob die Aufgabenverwaltung bereits intialisiert wurde. Der Initialisierungsvorgang finden während des
	 * Ladens statt. Erst danach kann auf die Aufgabenliste in der Eigenschaft <a href="#Tasks">Tasks</a> zugegriffen
	 * werden. Standardwert ist <em>false</em>.
	 * @type Boolean
	 * @name initialized
	 * @memberof TaskManagement
	*/
	initialized: false
}))();

/**
 * Definiert den Menüpunkt <em>Aufgaben</em> im Klassenbuch, der neben einem Seitenmenü, das Zugriff auf verschiedene
 * Verwaltungsfunktionen bietet, eine sortierbare, tabellarische Darstellung aller Aufgaben enthält.
 * @class
 * @inherits Controls.View
*/
TaskManagement.View = Class.create(Controls.View, /** @scope TaskManagement.View.prototype */ {
	initialize: function($super) {
		/**
		 * Gibt an, ob die Ansicht bereits initialisiert worden ist, also die Aufgabentabelle, das Seitenmenü bereits
		 * eingerichtet wurden. Dies geschieht erst, wenn der Menüpunkt auch wirklich angezeigt werden soll, und kann
		 * somit den Start des Klassenbuchs beschleunigen (<em>be lazy</em>).
		 * @type Boolean
		 * @name initialized
		 * @memberof TaskManagement.View
		*/
		this.initialized = false;
		
		/**
		 * Gibt an, ob die Aufgaben der letzten 30 Tage an Stelle der anstehenden Aufgaben angezeigt werden sollen.
		 * Wird dieser Wert geändert, muss die Methode <a href="#update">update</a> aufgerufen werden, damit die
		 * Änderung Wirkung zeigt.
		 * @type Boolean
		 * @name showPastTasks
		 * @memberof TaskManagement.View
		*/
		this.showPastTasks = false;
		
		// Legt den Menüpunkt an und erstellt die Überschrift 'Aufgaben'
		// Die Darstellung der gesamten Aufgabenansicht kann mit der CSS-Klasse 'tasksView' gesteuert werden.
		$super("Aufgaben", new Sprite("smallIcons", 13), "Aufgaben", { className: "tasksView" });
		
		// Registriert den Dialog zum Eintragen von Aufgaben als Unterknoten dieses Menüpunkts (siehe App.History.Node)
		this.registerSubNode("eintragen", TaskManagement.createTask.bind(TaskManagement), { restrictedAccess: true });
		
		// Jede einzelne Aufgabe ist ebenfalls ein "Unterknoten" dieses Menüpunkts (Knotenname ist die ID der Aufgabe)
		this.registerDynamicSubNode(
			// Gibt an Hand der Aufgaben-ID die Referenz auf die gewünschte Aufgabe zurück
			function(nodeName, state) {
				return TaskManagement.Tasks.find(function(task) {
					return task.id === parseInt(nodeName);
				});
			},
			
			// Prüft, ob es sich um eine gültige Aufgaben-ID handelt
			function(nodeName) {
				return TaskManagement.Tasks.pluck("id").include(parseInt(nodeName));
			}
		);
		
		// Wenn die Ansicht angezeigt wird
		this.on("activate", function() {
			if (!this.initialized) {
				/**
				 * Das HTML-Element, in dem weitere Informationen zu der gerade ausgewählten Aufgabe angezeigt werden. Hierzu
				 * zählen der Name der Person, welche die Aufgabe eingetragen hat und zusätzlich das Eintragedatum.
				 * @type ExtendedHTMLObject
				 * @private
				 * @name _taskInfoBox
				 * @memberof TaskManagement.View
				*/
				// Die Darstellung des Elements kann mit der CSS-Klasse 'infoBox' gesteuert werden.
				this._taskInfoBox = this.element.createChild({ className: "infoBox" });
				
				this._initializeSideMenu();
				this._initializeTable();
				
				this.registerChildControl(this._taskTable, this._sideMenu);
				
				/**
				 * Auswahlmenü, mit dem der Benutzer wählen kann, ob alle anstehenden Aufgaben oder die Aufgaben der letzten
				 * 30 Tage angezeigt werden sollen. Standardmässig werden alle anstehenden Aufgaben angezeigt.
				 * @type Controls.DropDownSelection
				 * @private
				 * @memberof TaskManagement.View
				 * @name _timeChooser
				*/
				this._timeChooser = this.additionalCommands.insertControl(new Controls.DropDownSelection([
					"Anstehende Aufgaben",
					"Aufgaben der letzten 30 Tage"
				]));
				
				// Wenn der Benutzer einen anderen Zeitmodus auswählt...
				this._timeChooser.on("change", function(selection) {
					this.showPastTasks = selection === "Aufgaben der letzten 30 Tage";
					this.update();
				}, this);
				
				// Bestimmte Methoden dieser Klasse müssen aufgerufen werden, wenn der Benutzer sich z. B. an- oder abmeldet
				this._onExternalEvent(TaskManagement, "updated", this.update, this);
				this._onExternalEvent(User, "signIn", this._onSignIn, this);
				this._onExternalEvent(User,	"signOut", this._onSignOut, this);
				
				this.update();
				
				// Ansicht ist nun fertig initialisiert
				this.initialized = true;
			}
		}, this);
	},
	
	/**
	 * Erstellt die Tabelle, in der die Aufgaben aufgelistet sind. Dabei werden einerseits die Tabellenspalten definiert,
	 * Funktionen verschiedenen Ereignissen zugeordnet. Ferner wird das Sortierverhalten der einzelnen Spalten definiert
	 * und die Art und Weise, wie der Tabelleninhalt formatiert wird
	 * @memberof TaskManagement.View
	*/
	_initializeTable: function() {
		// Fügt das Tabellen-Steuerelement in die Ansicht ein. Beim Aktualisieren der Daten in der Tabelle soll die
		// aktive Zeile aktiviert bleiben
		
		/**
		 * Die Tabelle, in der die Aufgaben aufgelistet werden. Das ganze Verhalten und Aussehen der Tabelle wird in
		 * der Methode <a href="TaskManagement.View.htm#_initializeTable">_initializeTable</a> definiert. Sollten keine Aufgaben
		 * vorhanden sein, wird anstelle der Tabelle ein entsprechender Hinweis angezeigt (siehe
		 * <a href="#_noTasksMessage">_noTasksMessage</a>).
		 * @type Controls.Table
		 * @private
		 * @memberof TaskManagement.View
		 * @name _taskTable
		*/
		this._taskTable = this.content.insertControl(new Controls.Table({ keepHighlightedOnUpdate: "id" }));
		
		// Definiert die Tabellenspalten
		this._taskTable.addColumn("Datum", function(task) {
				return task.date.getTimestamp();
			}, {
				width: "120px",
				sortable: true,
				showSortedInGroups: "mergeGroupCell",
				allowReversedSorting: true,
				sortType: "numeric",
				
				processCellContent: function(a) {
					var date = Date.fromTimestamp(a);
					var today = Date.getTodaysTimestamp();
					
					switch (a) {
						case today: 		return "Heute"; break;
						case today + 86400: return "Morgen"; break;
						case today - 86400: return "Gestern"; break;
						default: 			return date.format("D, j. F"); break;
					}
				}
			}
		);
		
		this._taskTable.addColumn("Wichtig",	function(task) {
				return (task.important) ? "a" : "b";
			}, {
				width: "4px",
				sortable: true,
				showSortedInGroups: "outlookStyle",
				icon: new Sprite("smallIcons", 17, "importantHeaderIcon"),
				centerColumnText: true,
				
				processCellContent: function(a) {
					return (a === "a") ? (new Sprite("smallIcons", 20)).toHTML("importantIcon") : "&nbsp;";
				},
				
				processGroupCaption: function(a) {
					return (a === "a") ? "Wichtig" : "Normal";
				}
			}
		);
		
		this._taskTable.addColumn("Fach", "subject", {
				width: "120px",
				sortable: true,
				showSortedInGroups: "outlookStyle",
				processGroupCaption: Prototype.K,
				
				processCellContent: function(a, task) {
					a = task.subjectShorted;
					return (task.removed) ? "<span class=\"removedTask\">" + a + "</span>" : a;
				}
			}
		);
		
		this._taskTable.addColumn("Aufgabe", "text", {
				width: "450px",
				sortable: true,
				allowReversedSorting: true,
				
				processCellContent: function(a, task) {
					return (task.removed) ? "<span class=\"removedTask\">" + a + " (gelöscht)</span>" : a;
				}
			}
		);
		
		this._taskTable.addColumn("Kommentare", function(task) {
				return task.comments + ((task.newComments) ? " (neu)" : "");
			}, {
				width: "40px",
				sortable: true,
				showSortedInGroups: "outlookStyle",
				icon: new Sprite("smallIcons", 16, "commentsHeaderIcon"),
				sortType: "numeric",
				centerColumnText: true,
				standardSortDirection: "descending",
				
				processGroupCaption: function(a) {
					a = parseInt(a);
					return (a === 0) ? "Keine Kommentare" : ((a > 0 && a < 10) ? "Wenige Kommentare" : "Viele Kommentare");
				},
				
				belongsToGroup: function(a, b) {
					a = parseInt(a);
					b = parseInt(b);
					return (a === 0 && b === 0) || (a > 0 && a < 10 && b > 0 && b < 10) || (a >= 10 && b >= 10);
				},
				
				processCellContent: function(a, task) {
					a = a.replace(" (neu)", "<img class=\"newComments\" src=\"design/default/images/newComments.gif\" />");
					return (task.removed) ? "<span class=\"removedTask\">" + a + "</span>" : a;
				}
			}
		);
		
		this._taskTable.addColumn("Aktionen", (function(task) {
				/**
				 * Der HTML-Text für die Aktionssymbole, die angezeigt werden, wenn das Seitenmenü ausgeblendet ist.
				 * Wird aus Performancegründen gecached, da in der Spalte "Aktionen" alle Zellen den gleichen Inhalt haben.
				 * @type String
				 * @private
				 * @name _getContent5Cache
				 * @memberof TaskManagement.View
				*/
				this._getContent5Cache = this._getContent5Cache ||
					new Sprite("smallIcons", 0).toHTML("actionIcon iconShowComments") + ((User.signedIn) ? 
					new Sprite("smallIcons", 2).toHTML("actionIcon iconEditTask") +
					new Sprite("smallIcons", 4).toHTML("actionIcon iconDeleteTask") :
					new Sprite("smallIcons", 3).toHTML() +
					new Sprite("smallIcons", 5).toHTML());
				
				return "<div class=\"taskTableActions\" name=\"" + task.id + "\">" + this._getContent5Cache + "</div>";
			}).bind(this), {
				width: "80px",
				sortable: false,
				visible: false
			}
		);
		
		// Verbindet gewisse Methoden mit Ereignissen der Tabelle (z. B. wenn der Benutzer die Tabelle sortiert oder 
		// eine Aufgabe markiert
        this._taskTable.on("sort", this._onSort, this);
		this._taskTable.on("highlightRow", this._onHighlightTask, this);
		
		this._taskTable.on("refresh", function() {
			this._getContent5Cache = "";
		}, this);
		
		// Wird auf eine Aufgabe doppelt geklickt, wird das Kommentarfenster zu dieser Aufgabe geöffnet.
		this._taskTable.on("selectRow", function(task) {
			this.reportNavigation(task.id + "/kommentare");
		}, this);
		
		this._taskTable.element.observe("click", (function(event) {
			if (!this._sideMenu.visible()) {
				var element = event.element();
				
				if (element.hasClassName("actionIcon")) {
					var taskId = $(element.parentNode).readAttribute("name");
					
					if (taskId) {
						if (element.hasClassName("iconShowComments")) {
							this.reportNavigation(taskId + "/kommentare");
						} else if (element.hasClassName("iconEditTask")) {
							this.reportNavigation(taskId + "/bearbeiten")
						} else if (element.hasClassName("iconDeleteTask")) {
							this.removeTask(TaskManagement.Tasks.find(function(task) {
								return task.id == taskId;
							}));
						}
					}
				}
			}
		}).bindAsEventListener(this));
		
		// Zeichnet die Tabelle
		this._taskTable.refresh();
	},
	
	/**
	 * Erstellt das Seitenmenü. Dieses kann nach Belieben versteckt und wieder angezeigt werden. Wenn es versteckt wird,
	 * werden in der Aufgabenliste verschiedene Aktionssymbole angezeigt, um die Funktionen, die vom Seitenmenü
	 * bereitgestellt werden, zu ersetzen.
	 * @memberof TaskManagement.View
	*/
	_initializeSideMenu: function() {
		/**
		 * Das Seitenmenü der Aufgaben-Ansicht. Es kann versteckt werden. Die einzelnen Menüpunkte sind in der
	     * Eigenschaft <a href="Controls.SideMenu.Item.htm#items">items</a> definiert und können aktiviert bzw.
	     * deaktiviert werden. Siehe auch <a href="Controls.SideMenu.Item.htm">Controls.SideMenu.Item</a>.
		 * @type Controls.SideMenu
		 * @private
		 * @memberof TaskManagement.View
		 * @name _sideMenu
		*/
		this._sideMenu = new Controls.SideMenu(this, true);
		
		// Definiert die einzelnen Menüpunkte. Ausser beim Punkt <em>Aufgabe eintragen</em> werden alle Menüpunkte nicht
		// automatisch aktiviert bzw. deaktiviert.
		this._sideMenu.addItem("Kommentare anzeigen", new Sprite("smallIcons", 0), (function() {
				this.reportNavigation(this._taskTable.getHighlightedRow().id + "/kommentare");
			}).bind(this), {
				iconDisabled: new Sprite("smallIcons", 1),
				enable: false
			}
		);
		
		this._sideMenu.addItem("Aufgabe bearbeiten", new Sprite("smallIcons", 2), (function() {
				this.reportNavigation(this._taskTable.getHighlightedRow().id + "/bearbeiten/");
			}).bind(this), {
				iconDisabled: new Sprite("smallIcons", 3),
				enable: false
			}
		);
		
		this._sideMenu.addItem("Aufgabe löschen", new Sprite("smallIcons", 4), this.removeTask.bind(this), {
			iconDisabled: new Sprite("smallIcons", 5),
			enable: false
		});
		
		this._sideMenu.addItem("Aufgabe eintragen", new Sprite("smallIcons", 6),
			this.reportNavigation.bind(this, "eintragen"), {
				iconDisabled: new Sprite("smallIcons", 7),
				enable: false,
				signedInOnly: true
			}
		);
		
		// Legt den Hilfetext zur Aufgabenansicht fest, dessen Inhalt davon abhängt, ob der Benutzer angemeldet ist oder
		// nicht.
		this._sideMenu.setHelpText("Hier findest du die Aufgaben der kommenden Tage und Wochen. Du kannst die Tabelle " +
			"nach Belieben sortieren. <br /><br /><span class=\"notSignedIn\"" + 
			((User.signedIn) ? " style=\"display: none;\"" : "") + ">" + "Um selber Aufgaben eintragen und Kommentare " +
			"schreiben zu können, musst du dich zuerst anmelden.</span><span class=\"signedIn\"" + 
			((User.signedIn) ? "" : " style=\"display: none;\"") + ">Du kannst nun selber Aufgaben eintragen und " +
			"Kommentare schreiben.</span>");
		
		// Wenn das Seitenmenü versteckt wird, wird eine neue Schaltfläche zum Hinzufügen von Aufgaben angezeigt und
		// die Spalte "Aktionen" in der Aufgabentabelle angezeigt
		this._sideMenu.on("hide", function() {
			if (!this._newTaskButton) {
				this.additionalCommands.insert("<div class=\"divider\"></div>");
				
				/**
				 * Schaltfläche zum Hinzufügen von Aufgaben, die nur angezeigt wird, wenn das Seitenmenü ausgeblendet
				 * ist.
				 * @type Controls.Button
				 * @private
				 * @name _newTaskButton
				 * @memberof TaskManagement.View
				*/
				this._newTaskButton = this.additionalCommands.insertControl(new Controls.Button("Aufgabe eintragen", 
					this.reportNavigation.bind(this, "eintragen"), {
						onlySignedIn: true,
						icon: new Sprite("smallIcons", 6),
						iconDisabled: new Sprite("smallIcons", 7),
						className: "additionalAddButton"
					}
				));
				
				this.registerChildControl(this._newTaskButton);
			} else {
				// Wenn die Schaltfläche bereits existiert, muss sie lediglich sichtbar gemacht werden.
				this._newTaskButton.show();
			}
			
			this._taskInfoBox.hide();
			this._taskTable.columns[5].show();
			
			// Aufgaben können in diesem Modus nicht per Klick angewählt werden.
			this._taskTable.options.enableRowHighlighting = false;
			this._taskTable.refresh();
		}, this);
		
		this._sideMenu.on("show", function() {
			this._newTaskButton.hide();
			this._taskInfoBox.show();
			this._taskTable.columns[5].hide();
			this._taskTable.options.enableRowHighlighting = true;
			this._taskTable.refresh();
		}, this);
	},
	
	/**
	 * Wird dann aufgerufen, wenn sich der Benutzer erfolgreich beim Klassenbuch angemeldet hat.<br /><br />
	 * Wenn in diesem Moment eine Aufgabe markiert ist, werden die Funktionen <em>Kommentare anzeigen</em>, <em>Aufgabe
	 * bearbeiten</em> und <em>Aufgabe löschen</em> aktiviert. Zusätzlich wird eine Aktualisierung der Aufgabenliste
	 * erzwungen, da die Aufgabentabelle nun auch Informationen darüber enthalten soll, ob zu einer Aufgabe ungelesene
	 * Kommentare existieren.
	 * @memberof TaskManagement.View
	*/
	_onSignIn: function() {
		if (this._taskTable.getHighlightedRow()) {
			[1, 2].each(function(a) {
				this._sideMenu.items[a].enable();
			}, this);
		}
	},
	
	/**
	 * Wird dann aufgerufen, wenn sich der Benutzer vom Klassenbuch abgemeldet hat.<br /><br />
	 * Dabei werden die Funktionen <em>Aufgabe bearbeiten</em> und <em>Aufgabe löschen</em> im Seitenmenü deaktiviert.
	 * Ausserdem werden alle Informationen darüber, ob zu einer Aufgabe ungelesene Kommentare vorhanden sind, entfernt,
	 * was eine zusätzliche Anfrage an den Server einspart.
	 * @memberof TaskManagement.View
	*/
	_onSignOut: function() {
		[1, 2].each(function(a) {
			this._sideMenu.items[a].disable();
		}, this);
	},
	
	/**
	 * Wird aufgerufen, wenn der Benutzer auf eine Aufgabe klickt und sie so markiert. In der Folge werden verschiedene
	 * Funktionen im Seitenmenü aktiviert, was aber davon abhängt, ob der Benutzer angemeldet ist oder nicht. Zudem
	 * wird der Inhalt von <a href="#_taskInfoBox">_taskInfoBox</a> mit Informationen darüber gefüllt, wann und von wem
	 * die Aufgabe eingetragen worden ist.
	 * @param {Task} task Die markierte Aufgabe.
	 * @memberof TaskManagement.View
	*/
	_onHighlightTask: function(task) {
		var contact = Contacts.getContact.byId(task.userid);
		
		this._taskInfoBox.innerHTML = (contact) ? "Eingetragen am " + task.added.format("j. F") + "<br />von " +
			contact.getFullName() : "";
		
		this._sideMenu.items[0].enable();
		
		if (User.signedIn) {
			this._sideMenu.items[1].enable();
			this._sideMenu.items[2].enable();
		}
	},
	
	/**
	 * Wird aufgerufen, wenn der Benutzer die Aufgabentabelle sortiert hat. Dabei wird die Überschrift der Ansicht
	 * entsprechend angepasst (z. B. <em>Aufgaben (sortiert nach Fach)</em>)
	 * @param {String} column Der Name der Tabellenspalte, nach der sortiert wird (z. B. <em>Fach</em>).
	 * @memberof TaskManagement.View
	*/
	_onSort: function(column) {
		switch (column) {
			case "Fach":   	   this.title.innerHTML = "Aufgaben (sortiert nach Fach)"; break;
			case "Wichtig":	   this.title.innerHTML = "Aufgaben (sortiert nach Wichtigkeit)"; break;
			case "Kommentare": this.title.innerHTML = "Aufgaben (sortiert nach der Anzahl Kommentare)"; break;
			default:		   this.title.innerHTML = "Aufgaben"; break;
		}
	},

	/**
	 * Ermöglicht es, eine bestimmte Aufgabe zu löschen. Bevor die Aufgabe aber wirklich gelöscht wird, wird mit zwei
	 * Bestätigungsdialogen sichergestellt, dass der Benutzer die Aufgabe auch wirklich löschen will. Dazu wird die
	 * Methode <a href="TaskManagement.Task.htm#remove">remove</a> der Aufgabe aufgerufen.
	 * @param {Task} task (optional) - Die Aufgabe, die gelöscht werden soll. Wird keine Aufgabe angegeben, wird die
	 * markierte Aufgabe gelöscht.
	 * @memberof TaskManagement.View
	*/
	removeTask: function(task) {
		var task = task || this._taskTable.getHighlightedRow();
		
		if (task.removed) {
            alert("Diese Aufgabe wurde bereits gelöscht."); // Es bringt nichts, eine Aufgabe zweimal zu löschen ;-)
		} else if (confirm("Möchtest du die " + task.subjectShorted + "-Aufgabe \"" + task.text + "\" wirklich löschen?")
			&& confirm("Bist du wirklich ganz sicher?")) {
			task.remove();
		}
	},

	/**
	 * Ruft die gewünschten Aufgaben (letzte 30 Tage bzw. anstehende Aufgaben) aus der lokalen Kopie der Aufgabenliste
	 * (<a href="TaskManagement.htm#Tasks">TaskManagement.Tasks</a> ab und füllt damit die Aufgabentabelle
	 * <a href="#_taskTable">_taskTable</a>. Sollten keine Aufgaben gefunden werden, wird ein entsprechender Hinweis
	 * angezeigt.
	 * @memberof TaskManagement.View
	*/
	update: function() {
		this._taskTable.clear();
		
		if (this.showPastTasks) {
			var today = Date.getTodaysTimestamp();
			var tasks = TaskManagement.getTasksWithinTimeRange(today - 2592000, today);
		} else {
			var tasks = TaskManagement.getUpcomingTasks();
		}
		
		if (tasks.length > 0) {
			this._taskTable.addRows(tasks);
			this._taskTable.resort();
			
			// Deaktiviert wenn nötig verschiedene Seitenmenüoptionen
			if (!this._taskTable.getHighlightedRow() || !User.signedIn) {
				this._taskInfoBox.clear();
				
				$R(0, 2).each(function(a) {
					this._sideMenu.items[a].disable();
				}, this);
			}
			
			this._taskTable.show();
			
			if (this._noTasksMessage) {
				this._noTasksMessage.hide();
			}
		} else {
			// Generiert wenn nötig die "Keine Aufgaben"-Meldung
			if (!this._noTasksMessage) {
				/**
				 * Meldung, die angezeigt wird, wenn keine Aufgaben zur Anzeige vorhanden sind.
				 * @type ExtendedHTMLObject
				 * @private
				 * @name _noTasksMessage
				 * @memberof TaskManagement.View
				*/
				this._noTasksMessage = this.content.createChild({
					className: "noTasks",
					content: "Sun, fun, and nothing to do!"
				});
			}
			
			this._taskTable.hide();
		}
	}
});

/**
 * Stellt die Vorlage für das Fenster zum Bearbeiten und Eintragen von Aufgaben in die Aufgabenliste dar.<br /><br />
 * Das Fenster enthält einen kurzen Hilfetext und ein Formular, in dem ein Datum, der Text und die Wichtigkeit der 
 * Aufgabe gewählt werden können. Beim Feld <em>Fach</em> wird noch nichts hinzugefügt, da desen Inhalt davon abhängt,
 * ob eine Aufgabe bearbeitet oder eingetragen wird. Des weiteren bietet das Fenster zwei Schaltflächen zum Schliessen 
 * des Fensters und zum Speichern der Aufgabe.<br /><br />
 * Todo: Die neue Controls.Form-Klasse sollte hier verwendet werden.
 * @param {String} title Der Titel des Fensters (sollte noch etwas eleganter gelöst werden).
 * @class
 * @inherits Controls.Window
*/
TaskManagement.TaskWindowAbstract = Class.create(Controls.Window, /** @scope TaskManagement.TaskWindowAbstract.prototype */ {
	initialize: function($super, title) {
		// Versucht das Fenster zu initialisieren
		if (!$super("CreateEditTaskWindow", {
				centerOnScreen: true,
				title: title,
				onlyAllowOne: true
			})) {
			return false;
		}
		
		
		// Legt den Fensterinhalt fest
		this.content.innerHTML = "<h2>" + title + "</h2>" +
			"<p>Das Datum kannst du auf einfache Weise mit Hilfe des Kalenders wählen. Wenn es sich um eine Probe " +
			"oder sonst etwas Wichtiges handelt, kannst du das dazugehörige Feld markieren.</p>" +
			"<form action=\"javascript:void(null);\"><table>" +
			"	<tr>" +
			"		<td class=\"inputCaption\">Datum:</td><td></td>" +
			"	</tr><tr>" +
			"		<td class=\"inputCaption\">Fach:</td>" +
			"		<td class=\"subjectContainer\"></td>" +
			"	</tr><tr>" +
			"		<td class=\"inputCaption\">Aufgabe:</td>" +
			"		<td><input name=\"text\" type=\"text\" class=\"taskInput\" /></td>" +
			"	</tr><tr>" +
			"		<td class=\"inputCaption\">Wichtig:</td>" +
			"		<td><input name=\"important\" type=\"checkbox\" class=\"importantInput\" /></td>" +
			"	</tr>" + 
			"</table></form>" +
			"<table class=\"buttonContainer\"><tr><td></td><td></td></tr></table>";
		
		// Macht es möglich, dass man das Formular auch mit <em>Enter</em> absenden kann
		/**
		 * Das Formularelement.
		 * @type ExtendedHTMLObject
		 * @memberof TaskManagement.TaskWindowAbstract
		 * @name form
		*/
		this.form = this.select("form")[0].observe("submit", this._prepareSubmit.bind(this));

		/**
		 * Das Eingabefeld.
		 * @type ExtendedHTMLObject
		 * @memberof TaskManagement.TaskWindowAbstract
		 * @name taskInput
		*/
		this.taskInput = this.select(".taskInput").first().observe("keyup", this._handleInputChange.bind(this));
		this.importantInput = this.select(".importantInput").first();
		this.dateSelection = this.select("td")[1].insertControl(new Controls.Calendar({ allowWeekends: false, allowPast: false }));
		
		this.cancelButton = this.select(".buttonContainer td")[0].insertControl(new Controls.Button("Abbrechen", 				  
			this.close.bind(this), {
				icon: new Sprite("smallIcons", 4)
			}
		));
		
		this.submitButton = this.select(".buttonContainer td")[1].insertControl(new Controls.Button("<strong>Speichern</strong>",
			this._prepareSubmit.bind(this), {
				icon: new Sprite("smallIcons", 25),
				iconDisabled: new Sprite("smallIcons", 26),
				enabled: false
			}
		));
		
		this.registerChildControl(this.dateSelection, this.cancelButton, this.submitButton);
		
		this.on("remove", function() {
			this.form.stopObserving();
			this.taskInput.stopObserving();
		}, this);
		
		return true;
	},
	
	/**
	 * Wird aufgerufen, wenn der Benutzer eine Eingabe im Eingabefeld für den Aufgabentext getätigt hat und aktiviert
	 * bzw. deaktiviert je nach dem, ob im Eingabefeld Text vorhanden ist, die Schaltfläche zum Speichern der Aufgabe.
	 * @memberof TaskManagement.TaskWindowAbstract
	*/
	_handleInputChange: function() {
		this.submitButton[(this.taskInput.getValue()) ? "enable" : "disable"]();
	},

	/**
	 * Liest die Eingaben im Formular ein und gibt sie zurück. Diese Methode kann von den Subklassen überschrieben werden.
	 * @return {Object} Die Formulareingaben. Beispiel für einen Rückgabewert: <pre class="code">
{
	date: 1181470470,
	text: "Probe Buchhaltung",
	important: true
}
	 * </pre>
	 * @memberof TaskManagement.TaskWindowAbstract
	*/	
	getInput: function() {
		var inputs = this.form.serialize(true);
		
		// Da die 'this.form.serialize(true)' die Auswahl des Kalenders nicht zurückgeben kann wird hier dem Rückgabewert
		// noch der gewählte Zeitstempel hinzugefügt. Zusätzlich wird der Typ von 'important' noch in 'Boolean' geändert.
		return Object.extend(inputs, {
			important: inputs.important === "on",
			date: this.dateSelection.selectedDate.getTimestamp()
		});
	},
	
	/**
	 * Trifft verschiedene Vorbereitungen, um die Aufgabe abzuspeichern.<br /><br />Dabei werden einerseits die
	 * Formulareingaben mit <a href="#getInput">getInput</a> eingelesen. Sollte der Benutzer keinen Aufgabentext
	 * angegeben haben, wird er darauf hingewiesen. Ansonsten wird die Schaltfläche <em>Abspeichern</em> deaktiviert
	 * (um mehrmaliges Versenden zu verhindert) und die von der Subklasse definierte Methode
	 * <a href="#submit">submit</a> aufgerufen.
	 * @private
	 * @memberof TaskManagement.TaskWindowAbstract
	*/
	_prepareSubmit: function() {
		var input = this.getInput();
		
		if (input.text) {
			this.submitButton.disable();
			this.submit(input);
		} else {
			alert("Bitte gib eine Aufgabe ein.");
		}
	},

	/**
	 * Diese Methode dient nur als Platzhalter und muss zwingend von einer Subklasse implementiert werden, da die Art
	 * der Kommunikation mit dem Server davon abhängt, ob eine Aufgabe eingetragen oder bearbeitet wird.
	 * @memberof TaskManagement.TaskWindowAbstract
	*/	
	submit: Prototype.emptyFunction
});

/**
 * Definiert das Fenster, mit dem eine neue Aufgabe in das Klassenbuch eingetragen wird. Dazu wird die von
 * <a href="TaskManagement.TaskCreationWindow.htm">TaskManagement.TaskCreationWindow</a> definierte Fenstervorlage
 * um verschiedene Dinge ergänzt. Beispielsweise erhält der Benutzer in diesem Fenster die Möglichkeit, mit einem
 * Auswahlmenü das gewünschte Schulfach für die Aufgabe zu bestimmen.
 * @class
 * @inherits TaskManagement.TaskWindowAbstract
*/
TaskManagement.TaskCreationWindow = Class.create(TaskManagement.TaskWindowAbstract, /** @scope TaskManagement.TaskCreationWindow.prototype */ {
	/** @ignore */
	initialize: function($super) {
		// Initialisiert die allgemeine Fenstervorlage
		if (!$super("Aufgabe eintragen")) {
			return;
		}
		
		/**
		 * Das Drop-Down-Menü, mit dem der Benutzer das gewünschte Fach auswählen kann. Die Liste mit den Schulfächern
		 * stammt von <a href="TaskManagement.htm#subjects">TaskManagement.subjects</a>.
		 * @type Controls.DropDownSelection
		 * @name _subjectSelection
		 * @memberof TaskManagement.TaskCreationWindow
		*/
		this._subjectSelection = this.select(".subjectContainer")[0].insertControl(new Controls.DropDownSelection(TaskManagement.subjects));
		this.registerChildControl(this._subjectSelection);
		
		// Der Parameter 'true' bewirkt, dass das Fenster mit einer unmerklichen Verzögerung sichtbar gemacht wird, um
		// einen Darstellungsfehler mit unbekannter Quelle zu vermeiden.
		this.toggle(true);
	},
	
	/**
	 * Sendet die eingegebenen Daten an den Server, um die neue Aufgabe einzutragen. Diese Methode wird von der Methode 
	 * <a href="TaskManagement.TaskWindowAbstract.htm#_prepareSubmit">TaskManagement.TaskWindowAbstract._prepareSubmit</a>
	 * der Basisklasse aufgerufen. Siehe auch
	 * <a href="TaskManagement.TaskWindowAbstract.htm#submit">TaskManagement.TaskWindowAbstract.submit</a> für weitere
	 * Informationen dazu.
	 * @param {Object} input Das Literal der vom Benutzer getätigten Eingaben. Siehe auch
	 * <a href="TaskManagement.TaskCreationWindow.htm#getInput">TaskManagement.TaskCreationWindow.getInput</a>.
	 * @memberof TaskManagement.TaskCreationWindow
	*/
	submit: function(input) {
		var request = new JSONRPC.Request("createtask", [input.subject, input.date, input.text, input.important], {
			onSuccess: this._success.bind(this),
			
			onComplete: (function() {
				this.submitButton.enable();
			}).bind(this)
		});
	},
	
	/**
	 * Wird aufgerufen, wenn die Aufgabe erfolgreich eingetragen werden konnte. In diesem Fall gibt der Server die ID
	 * der neu eingetragenen Aufgabe zurück. Die Methode löst das Ereignis <em>created</em> aus und übergibt dabei die
	 * neu eingetragene Aufgabe und schliesst zum Schluss das Fenster.
	 * @param {JSONRPC.Response} response Die Antwort des Servers.
	 * @private
	 * @memberof TaskManagement.TaskCreationWindow
	*/
	_success: function(response) {
		this.fireEvent("created", new TaskManagement.Task(Object.extend(this.getInput(), {
			id: response.result,
			userid: User.id,
			added: Date.getCurrentTimestamp()
		})));
		
		this.close();
	},

	/**
	 * Überschreibt die in <a href="TaskManagement.TaskWindowAbstract.htm">TaskManagement.TaskWindowAbstract</a> definierte, 
	 * gleichnamige Methode. Der Grund dazu ist, dass diese Methode neben den anderen Eingabedaten noch das gewählte Fach
	 * zurückgeben muss. Deshalb wird das gewählte Fach noch mit den Daten kombiniert, die die Methode der Basisklasse
	 * bereitstellt. Beispiel für einen Rückgabewert:
<pre class="code">
{
	subject: "Wirtschaft und Recht",
	date: 1181470470,
	text: "Probe Buchhaltung",
	important: true
}
</pre>
	 * @memberof TaskManagement.TaskCreationWindow
	*/	
	getInput: function($super) {
		return Object.extend($super(), {
			subject: this._subjectSelection.getSelectedItem()
		});
	}
});

/**
 * Definiert das Fenster, mit dem eine Aufgabe im Klassenbuch bearbeitet werden kann. Dazu wird die von
 * <a href="TaskManagement.TaskCreationWindow.htm">TaskManagement.TaskCreationWindow</a> definierte Fenstervorlage um 
 * verschiedene Dinge ergänzt. Das Datum der Aufgabe wird im Kalender markiert und die restlichen Eingabefelder
 * (Text der Aufgabe und Angabe zur Wichtigkeit) werden mit den entsprechenden Daten gefüllt. Das Schulfach kann nicht
 * geändert werden und wird deshalb als normaler Text dargstellt.
 * @param {Task} task Die zu bearbeitende Aufgabe (Referenz zu dieser).
 * @class
 * @inherits TaskManagement.TaskWindowAbstract
*/
TaskManagement.TaskEditingWindow = Class.create(TaskManagement.TaskWindowAbstract, /** @scope TaskManagement.TaskEditingWindow.prototype */ {
	/** @ignore */
	initialize: function($super, task) {
		/**
		 * Die zu bearbeitende Aufgabe.
		 * @type task
		 * @name task
		 * @memberof TaskManagement.TaskEditingWindow
		*/		
		this.task = task;
		
		if (!$super("Aufgabe bearbeiten")) {
			return;
		}
		
		this.submitButton.enable();
		this.dateSelection.setSelectedDate(this.task.date);
		this.select(".subjectContainer").first().innerHTML = "<em>" + this.task.subject + "</em>";
		
		(function() {
			this.taskInput.value = this.task.text;
		}).bind(this).defer(10);
		
		if (this.task.important) {
			this.importantInput.checked = "checked";
		}

		// Der Parameter 'true' bewirkt, dass das Fenster mit einer unmerklichen Verzögerung sichtbar gemacht wird, um
		// einen Darstellungsfehler mit unbekannter Quelle zu vermeiden.		
		this.toggle(true);
	},

	/**
	 * Sendet die eingegebenen Daten an den Server, um die Aufgabe zu ändern. Diese Methode wird von der Methode 
	 * <a href="TaskManagement.TaskWindowAbstract.htm#_prepareSubmit">TaskManagement.TaskWindowAbstract._prepareSubmit
	 * </a> der Basisklasse aufgerufen. Siehe auch <a href="TaskManagement.TaskWindowAbstract.htm#submit">
	 * TaskManagement.TaskWindowAbstract.submit</a> für für weitere Informationen dazu.
	 * @param {Object} input Das Literal der vom Benutzer getätigten Eingaben. Siehe auch
	 * <a href="TaskManagement.TaskEditingWindow.htm#getInput">TaskManagement.TaskEditingWindow.getInput</a>.
	 * @memberof TaskManagement.TaskEditingWindow
	*/
	submit: function(input) {
		var request = new JSONRPC.Request("edittask", [this.task.id, input.date, input.text, input.important], {
			onComplete: (function() {
				this.submitButton.enable();
			}).bind(this),
			
			onSuccess: this._success.bind(this)
		});		
	},

	/**
	 * Wird aufgerufen, wenn die Aufgabe erfolgreich geändert werden konnte. Da die Eigenschaft
	 * <a href="TaskManagement.TaskEditingWindow.htm#task">TaskManagement.TaskEditingWindow.task</a> eigentlich nichts
	 * als eine Referenz zu der Aufgabe ist, werden die Änderungen gleich auf die Aufgabe übertragen. Die Methode löst
	 * das Ereignis <em>edited</em> aus und schliesst zum Schluss das Fenster.
	 * @private
	 * @param {JSONRPC.Response} response Die Antwort des Servers.
	 * @memberof TaskManagement.TaskEditingWindow
	*/	
	_success: function(response) {
		var input = this.getInput();
		
		this.task.date = Date.fromTimestamp(input.date);
		this.task.text = input.text;
		this.task.important = input.important;
		
		this.fireEvent("edited");
		this.close();
	}
});

/**
 * Enthält Informationen über eine einzelne Aufgabe und stellt verschiedene Methoden bereit, um beispielsweise die
 * die Aufgabe zu löschen oder deren Kommentare anzuzeigen.
 * @class
 * @inherits EventPublisher
*/
TaskManagement.Task = Class.create(EventPublisher, App.History.Node.prototype, /** @scope TaskManagement.Task */ {
	/** @ignore */
    initialize: function($super, task) {
   		/**
		 * Die einzigartige ID der Aufgabe.
		 * @type Integer
		 * @memberof TaskManagement.Task
		 * @name id
		*/
        this.id = task.id;
        
		/**
		 * Das Datum der Aufgabe.
		 * @type Date
		 * @memberof TaskManagement.Task
		 * @name date
		*/
		this.date = Date.fromTimestamp(task.date);
		
		/**
		 * Das Schulfach.
		 * @type String
		 * @memberof TaskManagement.Task
		 * @name subject
		*/
        this.subject = task.subject;
        
		/**
		 * Gibt an, ob die Aufgabe speziell wichtig ist, z. B. wenn es sich um eine Probe handelt.
		 * @type Boolean
		 * @memberof TaskManagement.Task
		 * @name important
		*/
        this.important = task.important || false;
        
		/**
		 * Der eigentliche Aufgabentext
		 * @type String
		 * @memberof TaskManagement.Task
		 * @name text
		*/
        this.text = task.text;
        
		/**
		 * Wann die Aufgabe eingetragen wurde.
		 * @type Date
		 * @memberof TaskManagement.Task
		 * @name added
		 * @todo Zu Date wechseln
		*/
        this.added = Date.fromTimestamp(task.added);
        
		/**
		 * Die ID des Benutzers, von dem die Aufgabe eingetragen wurde.
		 * @type Integer
		 * @memberof TaskManagement.Task
		 * @name userid
		*/
        this.userid = task.userid;
        
		/**
		 * Die Anzahl der Kommentare, die zu dieser Aufgabe geschrieben wurden.
		 * @type Integer
		 * @memberof TaskManagement.Task
		 * @name comments
		*/
        this.comments = task.comments || 0;
        
		/**
		 * Gibt an, ob ungelesene Kommentare zu dieser Aufgabe vorhanden sind. Wenn der Benutzer nicht angemeldet ist,
		 * ist dieses Feld in jedem Fall <em>false</em>.
		 * @type Boolean
		 * @memberof TaskManagement.Task
		 * @name newComments
		 * @todo zu hasUnreadComments umbenennen
		*/
		this.newComments = task.newcomments || false;
		
		/**
		 * Gibt an, ob die Aufgabe als "gelöscht" markiert wurde.
		 * @type Boolean
		 * @memberof TaskManagement.Task
		 * @name removed
		*/
		this.removed = task.removed || false;
		
		/**
		 * Die abgekürzte Schreibweise des Schulfachs.
		 * @type String
		 * @memberof TaskManagement.Task
		 * @name subjectShorted
		*/
		this.subjectShorted = TaskManagement.subjectsShort[TaskManagement.subjects.indexOf(this.subject)];
		
		$super();
		this.initializeHistoryNode();
		
		this.registerSubNode("bearbeiten", this.edit.bind(this), {
			restrictedAccess: true
		});
		
		this.registerSubNode("kommentare", this.showComments.bind(this));
	},

	/**
	 * Zeigt die Kommentare zu dieser Aufgabe in einem Fenster (<a href="Comments.MainWindow.htm">Comments.MainWindow</a>)
	 * an. Falls der Benutzer angemeldet ist, wird vermerkt, dass zu dieser Aufgabe keine ungelesenen Kommentare existieren
	 * und das Ereignis <em>change</em> augelöst.
	 * @memberof TaskManagement.Task
	*/
	showComments: function() {
		if (User.signedIn && this.newComments) {
			this.newComments = false;
			this.fireEvent("change");
		}
		
        var commentsWindow = new Comments.MainWindow(this);
        
        // Wenn ein neuer Kommentar geschrieben wird, wird ebenfalls das Ereignis <em>change</em> ausgelöst.
		commentsWindow.on("createComment", this.fireEvent.bind(this, "change"));
		commentsWindow.on("leave", this.leave, this);
        
        return commentsWindow;
    },

	/**
	 * Zeigt ein Fenster (<a href="TaskManagement.TaskEditingWindow.htm">TaskManagement.TaskEditingWindow</a>) zum
	 * Bearbeiten dieser Aufgabe an. Sollte der Benutzer eine Änderung vornehmen und diese Abspeichern, wird das
	 * Ereignis <em>change</em> augelöst.
	 * @memberof TaskManagement.Task
	*/
	edit: function() {
		var editWindow = new TaskManagement.TaskEditingWindow(this);
		
		editWindow.on("edited", this.fireEvent.bind(this, "change"));
		editWindow.on("leave", this.fireEvent.bind(this, "leave"));
		
		return editWindow;
	},

	/**
	 * Vermerkt eine Aufgabe in der Datenbank als "gelöscht". Zudem wird das Ereignis <em>change</em> augelöst.
	 * @memberof TaskManagement.Task
	*/	
	remove: function() {
        var request = new JSONRPC.Request("removetask", [this.id], {
			onSuccess: (function(response) {
				this.removed = true;
				this.fireEvent("change");
			}).bind(this)
		});
	}
});

// Bewirkt, dass beim Initialisieren des Klassenbuchs die Aufgabenansicht als Menüpunkt dem Klassenbuch hinzugefügt wird
App.on("initialize", function() { App.Menu.addTab(new TaskManagement.View()); });