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
 * @fileOverview Enthält den Menüpunkt "Dateiablage" und alles was dazu gehört. Dazu gehört das Fenster zum Hochladen
 * von neuen Dateien (<a href="Storage.UploadWindow.htm">Storage.UploadWindow</a>), die Klasse
 * <a href="Storage.File.htm">Storage.File</a>, die eine einzelne Datei repräsentiert und natürlich die Ansicht selber
 * <a href="Storage.View.htm">Storage.View</a>.
*/

/**
 * Dient als eine Art Namensraum für alles, was mit der Dateiablage in Verbindung steht. Enthalten ist eine Auflistung
 * aller Dateien in der Dateiablage sowie die dazugehörigen Aktualisierungs-Mechanismen. Ausserdem bietet diese statische
 * Klasse Funktionen, die den Zugriff auf die Auflistungen verschiedener Dateitypen und -kategorien bieten.
 * @class
 * @static
 * @inherits EventPublisher
*/
var Storage = Object.extend(new EventPublisher(), /** @scope Storage */ {
	/**
	 * Initialisiert die Dateiablage beim Start des Klassenbuchs. Um sich einen weiteren Aufruf des Servers zu
	 * ersparen, wird die Dateiliste bereits mit der Datei index.php mitübertragen. Diese Daten werden mit dieser
	 * Funktion in die Dateiablage eingefügt. Zudem wird noch die automatische Aktualisierung eingerichtet.
	 * @memberof Storage
	*/	
	initialize: function() {
		// Verhindert, dass die Dateiablage mehrmals initialisiert werden kann
		if (!Storage.initialized) {
            var data = DirectData.get("files");
            
            if (data) {
				Storage._updateSuccess(new JSONRPC.Response(data.result));
			}
			
			/**
			 * Bewirkt, dass ungefähr jede Viertelstunde eine Anfrage an den Server gesendet wird, um die Aufgabenliste zu
			 * aktualisieren.
			 * @type PeriodicalExecuter
			 * @memberof Storage
			 * @name periodicalUpdate
			*/
			Storage.periodicalUpdate = new PeriodicalExecuter(Storage.update, 3200);
			Storage.initialized = true;
		}
	},
	
	/**
	 * Ruft die Liste der Dateien in der Dateiablage vom Server ab. Diese Funktion wird durch
	 * <a href="#periodicalUpdate">periodicalUpdate</a> in regelmässigen Abständen aufgerufen. Gibt der Server eine
	 * gültige Antwort zurück, wird diese an die private Funktion <a href="#_updateSuccess">_updateSuccess</a>
	 * übergeben.
	 * @memberof Storage
	*/
    update: function() {
		var request = new JSONRPC.Request("getfiles", [], { onSuccess: Storage._updateSuccess });
    },
	
	/**
	 * Verarbeitet die Antwort des Servers, die die Dateiliste enthält. Am Schluss löst die Funktion noch das Ereignis
	 * <em>updated</em> aus.
	 * @param {JSONRPC.Response} response Die Antwort des Servers. Die eigentliche Dateiliste befindet sich in der
	 * Eigenschaft <em>result</em>.
	 * @memberof Storage
	*/
    _updateSuccess: function(response) {
		Storage.files.clear();
		
		response.result.each(function(fileInformation) {
			Storage._addFile(new Storage.File(fileInformation))
		});
		
		Storage.fireEvent("updated");
    },

	/**
	 * Öffnet ein Fenster (<a href="Storage.UploadWindow.htm">Storage.UploadWindow.htm</a>, mit dem eine neue Datei in
	 * die Dateiablage hochgeladen werden kann. Wenn die Datei erfolgreich hochgeladen wurde, wird sie automatisch der
	 * lokalen Kopie der Dateiliste hinzugefügt, wodurch eine weitere Serverabfrage überflüssig wird.
	 * @returns {Storage.UploadWindow} Das neue Fenster.
	 * @memberof Storage
	*/
	uploadFile: function() {
		var uploadWindow = new Storage.UploadWindow();
		
		uploadWindow.on("success", function(file) {
			Storage._addFile(file);
			Storage.fireEvent("updated");
		});
		
		return uploadWindow;
	},

    /**
     * Interne Funktion, mit der eine Datei zur lokalen Kopie der Dateiliste
     * (<a href="Storage.htm#files">Storage.htm#files</a>) hinzugefügt wird. Dieser Umweg ist nötig, damit korrekt erkannt
     * wird, wenn die Eigenschaften der Datei vom Benutzer verändert werden (als "archiviert gekennzeichnet z. B.) und
     * dadurch Ereignis <em>updated</em> von <em>Storage</em> ausgelöst werden kann.
     * @param {Storage.File} file Die hinzuzufügende Datei
     * @memberof Storage
    */
	_addFile: function(file) {
		file.on("change", function() {
			Storage.fireEvent("updated");
		});
		
		Storage.files.push(file);
	},
	
    getFiles: {
        byType: function(type) {
            return Storage._getFiles("type", type);
        },
        
        byMediaGroup: function(group) {
			if (Storage.mediaGroups[group]) {
				return Storage.mediaGroups[group].collect(Storage.getFiles.byType).flatten();
			}
        },
        
		notArchived: function() {
			return Storage._getFiles("archived", false);
        },
        
        archived: function() {
			return Storage._getFiles("archived", true);
        }
    },
	
    _getFiles: function(a, b) {
        return Storage.files.findAll((Object.isFunction(a)) ? a : function(file) {
			return file[a] == b;
        });
    },

    files: [],
    
	initialized: false,
    
    mediaGroups: {
		pictures: ["jpg", "gif", "bmp", "png"],
		documents: ["doc", "docx", "xls", "xlsx", "pdf", "txt"],
		archives: ["rar", "zip"]
    },
    
    fileSizeRanges: [
		{ range: $R(0,       49999),     name: "Sehr klein"  },
		{ range: $R(50000,   199999),    name: "Klein"       },
		{ range: $R(200000,  499999),    name: "Mittelgross" },
		{ range: $R(500000,  999999),    name: "Gross"       },
		{ range: $R(1000000, 2499999),   name: "Sehr gross"  },
		{ range: $R(2500000, 999999999), name: "Riesig"      }
	],
	
	fileTypes: {
		doc:  { description: "Microsoft Office Word 97 - 2003-Dokument", icon: 1 },
		docx: { description: "Microsoft Office Word-Dokument", icon: 2 },
		jpg:  { description: "JPEG-Bild", icon: 3 },
		png:  { description: "PNG-Bild", icon: 4 },
		gif:  { description: "GIF-Bild", icon: 5 },
		bmp:  { description: "BMP-Datei", icon: 6 },
		pdf:  { description: "PDF-Dokument", icon: 7 },
		rar:  { description: "WinRAR-Archiv", icon: 8 },
		zip:  { description: "ZIP-Archiv", icon: 8 },
		txt:  { description: "TXT-Datei", icon: 9 },
		mp3:  { description: "MP3-Audiodatei", icon: 10 },
		xlsx: { description: "Microsoft Office Excel-Arbeitsblatt", icon: 11 },
		xls:  { description: "Microsoft Office Excel 97 - 2003-Arbeitsblatt", icon: 12 },
		exe:  { description: "Anwendung", icon: 0 }
	}
});

App.on("initialize", Storage.initialize);

/**
 * Enthält Informationen über eine einzelne Datei und stellt verschiedene Methoden bereit, um beispielsweise die
 * die Datei zu archivieren oder herunterzuladen.
 * @class
 * @inherits EventPublisher
*/
Storage.File = Class.create(EventPublisher, /** @scope Storage.File */ {
    initialize: function($super, file) {
		$super();
		
   		/**
		 * Die einzigartige ID der Datei.
		 * @type Integer
		 * @memberof Storage.File
		 * @name id
		*/
		this.id = file.id;
		
   		/**
		 * Wann die Datei hochgeladen wurde.
		 * @type Date
		 * @memberof Storage.File
		 * @name uploaded
		*/
		this.uploaded = new Date(file.uploaded * 1000);
		
   		/**
		 * Die Grösse der Datei in Bytes.
		 * @type Integer
		 * @memberof Storage.File
		 * @name size
		*/
		this.size = file.size;
		
   		/**
		 * Der Name der Datei
		 * @type String
		 * @memberof Storage.File
		 * @name name
		*/
		this.name = file.name;
		
   		/**
		 * Die ID des Benutzers, von dem die Datei hochgeladen wurde.
		 * @type Integer
		 * @memberof Storage.File
		 * @name userid
		*/
		this.userid = file.userid;
		
   		/**
		 * Die Beschreibung der Datei. Standardwert ist <em>""</em>.
		 * @type String
		 * @memberof Storage.File
		 * @name description
		*/
		this.description = file.description || "";
		
   		/**
		 * Gibt an, ob die Datei bereits zu den archivierten Dateien zählt, sei dies nun, weil sie manuell archiviert
		 * wurde, oder seit dem Hochladen 30 Tage verstrichen sind. Standardwert ist <em>false</em>.
		 * @type Boolean
		 * @memberof Storage.File
		 * @name archived
		*/
		this.archived = file.archived || false;
		
   		/**
		 * Die Dateiendung, die aus dem Dateinamen extrahiert wird.
		 * @type String
		 * @memberof Storage.File
		 * @name type
		*/
        this.type = this.name.split(".").last().toLowerCase();
    },
    
    /**
     * Gibt die Beschreibung des Dateityps dieser Datei zurück. Die Funktion bezieht sich dabei auf den Wert der
     * Eigenschaft <a href="#type">type</a> und überprüft, ob in der Liste der Dateitypbeschreibungen in
     * <a href="Storage.htm#fileTypes">Storage.fileTypes</a> diese Dateiendung enthalten ist.
     * @returns {String} Die Beschreibung des Dateityps dieser Datei.
     * @memberof Storage.File
    */
    getTypeDescription: function() {
        var fileType = Storage.fileTypes[this.type];
        return (fileType && fileType.description) ? fileType.description : this.type.toUpperCase() + "-Datei";
    },
    
    getSmallIconAsString: function() {
        var fileType = Storage.fileTypes[this.type];
        return (new Sprite("fileTypesSmall", (fileType) ? fileType.icon : 0)).toHTML("fileTypeIcon");
    },

    /**
     * Lädt die Datei herunter. Dabei wird sichergestellt, dass die Datei in einem neuen Fenster geöffnet wird.
     * @memberof Storage.File
    */
    download: function() {
		window.open("files/" + this.name, "_blank", "");
    },

    /**
     * Markiert die Datei als "archiviert" und löst dann das Ereignis <em>change</em> aus.
     * @memberof Storage.File
    */
    archive: function() {
		var request = new JSONRPC.Request("archivefile", [this.id], {
			onSuccess: (function() {
				this.archived = true;
				this.fireEvent("change");
			}).bind(this)
		});
    }
});

Storage.View = Class.create(Controls.View, {
	initialize: function($super) {
		$super("Dateiablage", new Sprite("smallIcons", 11), "Dateiablage", { className: "storageView" });
		
		this.registerSubNode("hochladen", Storage.uploadFile, { restrictedAccess: true });
		
		this.on("activate", (function() {
			if (!this.initialized) {
				this.filesTable = this.content.insertControl(new Controls.Table({ enableRowHighlighting: false }));
				this.filesTable.on("sort", this._updateTitle.bind(this));
				
				this.filesTable.addColumn("Datei", function(a) {
						return "<a href=\"files/" + a.name + "\" target=\"_blank\" title=\"" + a.getTypeDescription() +
							"\">" + a.getSmallIconAsString() + a.name.truncate(22) + "</a>";
					}, {
						width: "170px",
						sortable: true,
						allowReversedSorting: true
					}
				);
				
				this.filesTable.addColumn("Beschreibung", "description", {
					width: "340px",
					sortable: true,
					allowReversedSorting: true
				});
				
				this.filesTable.addColumn("Grösse", "size", {
					width: "60px",
					sortable: true,
					showSortedInGroups: "outlookStyle",
					sortType: "numeric",
					standardSortDirection: "descending",
					
					processCellContent: function(a) {
						return a.getFormatedDataSize();
					},
					
					belongsToGroup: function(a, b) {
						return Storage.fileSizeRanges.any(function(r) {
							return r.range.include(a) && r.range.include(b || -1);
						});
					},
					
					processGroupCaption: function(a) {
						return Storage.fileSizeRanges.find(function(r) {
							return r.range.include(a);
						}).name;
					}
				});
				
				this.filesTable.addColumn("Hochgeladen von", function(a) {
						return Contacts.getContact.byId(a.userid).nickname;
					}, {
						width: "100px",
						sortable: true,
						showSortedInGroups: "outlookStyle"
					}
				);
				
				this.filesTable.addColumn("Datum", function(a) {
						return a.uploaded.getTimestamp();
					}, {
						width: "100px",
						sortable: true,
						allowReversedSorting: true,
						sortType: "numeric",
						standardSortDirection: "descending",
						
						processCellContent: function(a) {
							return (new Date(a * 1000)).format("d.m.Y, H:i");
						}
					}
				);
				
				this.filesTable.addColumn("Aktionen", function(a) {
						if (User.signedIn && !a.archived && a.userid === User.id) {
							return "<a href=\"javascript:void(null);\" class=\"archiveLink\" fileid=\"" + a.id +"\">" + 
								new Sprite("smallIcons", 31).toHTML("archiveIcon") + " Archivieren</a>";
						} else {
							return "";
						}
					}, {
						width: "85px",
						sortable: false,
						visible: User.signedIn
					}
				);
				
				this.filesTable.on("refresh", function() {
					if (User.signedIn && this.currentMediaGroup !== "archived") {
						this.filesTable.select(".archiveLink").each(function(link, i) {
							link.observe("click", (function() {
								var fileId = link.readAttribute("fileid");
								var file = Storage.files.find(function(file) {
									if (file.id == fileId) {
										return file;
									}
								});
								
								if (confirm("Möchtest du die Datei " + file.name + " wirklich " +
									"archivieren? Die Datei wird nicht gelöscht, sondern erscheint weiderhin in der " +
									"Ansicht \"Alte Dateien\".")) {
									file.archive();
								}
							}).bind(this));
						}, this);
					}
				}, this);
				
				this.filesTable.sortAfterColumn = 4;
				
				this.filterChooser = this.additionalCommands.insertControl(new Controls.DropDownSelection([
					"Neue Dateien",
					"Dokumente",
					"Bilder",
					"Archive",
					"Alte Dateien"
				]));
				
				this.filterChooser.on("change", function(filter) {
					switch (filter) {
						case "Neue Dateien": this.currentMediaGroup = "";    	   break;
						case "Dokumente": 	 this.currentMediaGroup = "documents"; break;
						case "Bilder": 		 this.currentMediaGroup = "pictures";  break;
						case "Archive":		 this.currentMediaGroup = "archives";  break;
						case "Alte Dateien": this.currentMediaGroup = "archived";  break;
					}
					
					this.update();
				 }, this);
				
				this.additionalCommands.createChild({ className: "divider" });
				
				this.uploadButton = this.additionalCommands.insertControl(new Controls.Button("Datei hochladen",
					this.reportNavigation.bind(this, "hochladen"), {
						onlySignedIn: true,
						icon: new Sprite("smallIcons", 11),
						iconDisabled: new Sprite("smallIcons", 12)
					}
				));
				
				this.registerChildControl(this.filesTable, this.filterChooser, this.uploadButton);
				
				this._onExternalEvent(Storage, "updated", this.update, this);
				
				this._onExternalEvent(User, "signIn", function() {
					this.filesTable.columns.last().show();
					this.update();
				}, this);
				
				this._onExternalEvent(User,	"signOut", function() {
					this.filesTable.columns.last().hide();
					this.update();
				}, this);
				
				this.update();
				this.initialized = true;
			}
		}).bind(this));
	},
	
	_updateTitle: function(name) {
		switch (name) {
			case "Datei":           this.title.innerHTML = "Dateiablage (sortiert nach Dateiname)";    break;
			case "Grösse":          this.title.innerHTML = "Dateiablage (sortiert nach Dateigrösse)";  break;
			case "Beschreibung":    this.title.innerHTML = "Dateiablage (sortiert nach Beschreibung)"; break;
			case "Hochgeladen von": this.title.innerHTML = "Dateiablage (sortiert nach Person)";       break;
			default:   	            this.title.innerHTML = "Dateiablage";                              break;
		}
	},
	
	update: function() {
        this.filesTable.clear();
        
        this.filesTable.addRows((this.currentMediaGroup) ? ((this.currentMediaGroup === "archived") ?
				Storage.getFiles.archived() :
				Storage.getFiles.byMediaGroup(this.currentMediaGroup)) :
			Storage.getFiles.notArchived());
		
        this.filesTable.resort();
	}
});

Storage.UploadWindow = Class.create(Controls.Window, /** @scope Storage.UploadWindow.prototype */ {
	initialize: function($super) {
		/**
		 * Gibt an, ob die vom Benutzer gewählte Datei gerade hochgeladen wird.
		 * @type Boolean
		 * @name uploadInProgress
		 * @memberof Storage.UploadWindow
		*/
        this.uploadInProgress = false;
        
		/**
		 * Gibt an, ob die Flashkomponente von SWFUpload bereit ist und der Benutzer somit eine Datei hochladen kann.
		 * @type Boolean
		 * @name flashReady
		 * @memberof Storage.UploadWindow
		*/
        this.flashReady = false;
        
		if (!$super("UploadWindow", { title: "Datei hochladen" })) {
			return;
        }
        
        // SWFUpload wird zuerst eine Sekunde Zeit gegeben, die Flashkomponente einzurichten. Danach wird erst der
        // Hinweis amgezeigt, dass die Flashkomponente anscheinend nicht funktioniert
        (function() {
			if (!this.flashReady) {
				this.update("<h2>Adobe Flash 9 ist nicht installiert</h2>" +
					"<p class=\"flashNotAvailable\">Um Dateien hochladen zu können, muss auf deinem Rechner " +
					"<a href=\"http://www.adobe.com/shockwave/download/download.cgi?P1_Prod_Version=ShockwaveFlash&promoid=BIOW\" " +
					"target=\"_blank\">Adobe Flash 9.0</a> installiert sein.</p>");
			}
        }).bind(this).delay(1);
        
        /**
         * Ermöglicht es dem Benutzer, eine Datei auszuwählen und übernimmt mit Hilfe von Adobe Flash das Hochladen
         * zum Server. Der Benutzer kann in diesem Dialog der Dateiablage jeweils nur eine Datei auswählen und muss
         * den Vorgang manuell starten, nachdem er eine Beschreibung der Datei eingegeben hat.
         * @type JSONRPC.Upload
         * @name _flashUpload
         * @memberof Storage.UploadWindow
        */
        this._flashUpload = new JSONRPC.Upload("uploadfile", [], {
			file_upload_limit: 1,
			begin_upload_on_queue: false
		});
		
		this._flashUpload.on("ready", this._ready, this);
		this._flashUpload.on("fileQueued", this._fileSelected, this);
		this._flashUpload.on("uploadProgress", this._progress, this);
		this._flashUpload.on("uploadSuccess", this._success, this);
		this._flashUpload.on("uploadFailure", this._failed, this);
        
        // Wird gerade eine Datei hochgeladen und der Benutzer will das Fenster schliessen, wird er darauf hingewiesen.
        this.on("beforeremove", function() {
			if (this.uploadInProgress && !confirm("Die Datei wird noch hochgeladen. Möchtest du den Vorgang wirklich abbrechen?")) {
				// Bestätigt er die Abfrage, wird der Upload abgebrochen
				this._flashUpload.cancelQueue();
				return false;
			}
        }, this);
        
        this.toggle(true);
	},
	
	_selectUploadView: function(view) {
        this.uploadViews.invoke("hide")[view].show();
	},
	
	_ready: function() {
		this.update("<div class=\"uploadView\">" +
            "   <h2>Datei hochladen</h2>" +
			"   <p>Klicke auf die Schaltfläche 'Durchsuchen...', wähle die gewünschte Datei aus und gib eine " +
			"	Beschreibung ein. Bestätige am Schluss mit einem Klick auf 'Hochladen'.</p>" +
            "   <table class=\"uploadForm\"><tr>" +
            "		<td class=\"caption\">Datei:</td>" +
            "		<td class=\"fileInputContainer\"></td>" +
            "	</tr><tr>" +
            "		<td class=\"caption\">Beschreibung:</td>" +
            "		<td><input class=\"descriptionInput\" type=\"text\" /></td>" +
            "	</tr><tr>" +
            "		<td>&nbsp;</td><td class=\"buttonContainer\"></td>" +
            "	</tr></table>" +
            "</div>" +
            "<div class=\"uploadView\">" +
            "   <h2>Datei wird hochladen</h2>" +
			"   <p>Die ausgewählte Datei wird nun zum Klassenbuch-Server hochgeladen.</p>" +
            "   <div class=\"uploadProgress\"></div>" +
            "</div>" +
            "<div class=\"uploadView\">" +
            "   <h2>Datei erfolgreich hochgeladen</h2>" +
			"   <p>Die ausgewählte Datei wurde erfolgreich auf dem Klassenbuch-Server abgelegt. " +
			"	Du kannst dieses Fenster nun schliessen.</p>" +
            "</div>" +
            "<div class=\"uploadView\">" +
            "   <h2>Fehler</h2>" +
			"   <p>Es ist ein unerwarteter Fehler beim Hochladen der Datei aufgetreten.</p>" +
			"   <p class=\"errorMessage\"></p>" +
            "</div>");
        
        this.uploadViews = this.select(".uploadView");
		this._selectUploadView(0);
        
        this._uploadButton = this.select(".buttonContainer")[0].insertControl(new Controls.Button("Hochladen",
			this.upload.bind(this), {
				icon: new Sprite("smallIcons", 11),
				iconDisabled: new Sprite("smallIcons", 12)
			}
		));
		
        this._browseButton = this.select(".fileInputContainer")[0].insertControl(new Controls.Button("Durchsuchen...",
			this._flashUpload.browse.bind(this._flashUpload)));
		
		this.registerChildControl(this._uploadButton, this._browseButton);
		this.flashReady = true;
	},
	
	_fileSelected: function(file) {
        this.selectedFile = file;
        this._browseButton.remove();
        
        this.select(".fileInputContainer")[0].innerHTML = "<strong>" + this.selectedFile.name + "</strong> <em>(" +
			this.selectedFile.size.getFormatedDataSize() + ")</em>";
	},
	
	upload: function() {
		if (!this.uploadInProgress) {
			if (!this.selectedFile) {
				alert("Bitte wähle eine Datei aus.");
				return false;
			}
			
			var description = this.getDescription();
			
			if (!description) {
				alert("Bitte gib eine Beschreibung ein.");
				return false;
			}	
			
			this._selectUploadView(1);
			
			this.select(".uploadProgress")[0].innerHTML = "<div class=\"fileNameContainer\">" +
				this.selectedFile.name + "</div><div class=\"fileSizeContainer\">" +
				this.selectedFile.size.getFormatedDataSize() + "</div><div class=\"progressBarContainer\"></div>";
				
			this._progressBar = this.select(".progressBarContainer")[0].insertControl(new Controls.ProgressBar());
			
			this.registerChildControl(this._progressBar);
			
			this._flashUpload.setJSONParams([description]);
			this._flashUpload.startUpload();
			
			this.uploadInProgress = true;
		}
	},
	
	_progress: function(file, bytesLoaded) {
		this._progressBar.setProgress(bytesLoaded / file.size);
	},
	
	_success: function(file, response) {
		if (this.uploadInProgress) {
			this.uploadInProgress = false;
			this._selectUploadView(2);
			
			this.fireEvent("success", new Storage.File({
				id: response.result,
				uploaded: Date.getCurrentTimestamp(),
				size: file.size,
				name: file.name,
				userid: User.id,
				description: this.getDescription()
			}));
		}
	},
	
	_failed: function(file, response) {
		if (this.uploadInProgress) {
			this.uploadInProgress = false;
			this._selectUploadView(3);
			this.select(".errorMessage")[0].innerHTML = response.faultString;
		}
	},
	
	getDescription: function() {
		return $F(this.select(".descriptionInput")[0]);
	}
});

App.on("initialize", function() { App.Menu.addTab(new Storage.View()); });