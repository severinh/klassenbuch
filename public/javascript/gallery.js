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
 * @fileOverview Enthält alles, was mit der Fotogalerie in Verbindung steht. Dazu zählt die Ansicht selber
 * (<a href="Gallery.View.htm">Gallery.View</a>), das Fenster zum Erstellen eines neuen Albums
 * (<a href="Gallery.Album.CreationWindow.htm">Gallery.Album.CreationWindow</a>), das Fenster, das alle Fotos in einem
 * Album anzeigt (<a href="Gallery.Album.Window.htm">Gallery.Album.Window</a>), das Fenster zum Hochladen von neuen
 * Fotos (<a href="Gallery.PictureUploadWindow.htm">Gallery.PictureUploadWindow</a>), die Diashow bzw. Grossansicht 
 * einzelner Fotos usw.. Hinzu kommen Klassen, die ein einzelnes Fotoalbum bzw. ein einzelnes Foto repräsentieren.
 * @author <a href="mailto:severinheiniger@gmail.com">Severin Heiniger</a>
*/

var Gallery = new (Class.create(JSONRPC.Store, {
	initialize: function($super) {
		$super();
		
		App.on("initialize", function() {
			this.options.itemClass = Gallery.Album;
			this.loadData(DirectData.get("albums").result);
		}, this);
	},
	
 	/**
	 * Ermöglicht es, ein neues Album zur Fotogalerie hinzuzufügen. Dazu wird ein entsprechendes Fenster 
	 * (<a href="Gallery.Album.CreationWindow.htm">Gallery.Album.CreationWindow</a>) angezeigt, in welchem der
	 * Benutzer dem neuen Album einen aussagekräftigen Namen geben kann.
	 * @memberof Gallery
	*/
    createAlbum: function() {
		return new Gallery.Album.CreationWindow();
    },
	
	add: function($super, album) {
		album.on("updated", this.fireEvent.bind(this, "updated"));
		
		$super(album);
	}
}))();

/**
 * Stellt ein einzelnes Fotoalbum dar, enthält einerseits Informationen über das Album und bietet die Möglichkeit,
 * neue Bilder zum Album hinzuzufügen, das Album herunterzuladen und ein Fenster anzuzeigen, in dem alle Fotos in dem
 * Album aufgelistet werden.<br /><br />Am Anfang enthält eine Instanz dieser Klasse noch nicht die Informationen
 * darüber, welche Bilder in diesem Album enthalten sind. Diese Information muss manuell mit der Methode
 * <a href="#_getPictures">_getPictures</a> abgerufen werden. Allerdings kann über den Konstruktor die Anzahl der
 * Fotos in diesem Album angegeben werden.
 * @class
*/
Gallery.Album = Class.create(/** @scope Gallery.Album */ {
	initialize: function(album) {
		this.update(album);
		
		this.pictures = new JSONRPC.Store({
			method: "gallery_getpictures",
			params: [this.id],
			itemClass: Gallery.Picture,
			periodicalUpdate: 120,
			unloadedCount: album.pictures
		});
		
		this.pictures.on("updated", this.fireEvent.bind(this, "updated"));
	},

	update: function(album) {
		/**
		 * Die einzigartige ID des Albums.
		 * @type Integer
		 * @property
		*/
		this.id = album.id;
		
		/**
		 * Der Titel des Albums.
		 * @type String
		 * @property
		*/
		this.name = album.name;
		
		/**
		 * Die Beschreibung des Albums. Sie muss nicht zwingend angegeben werden.
		 * @type String
		 * @memberof Gallery.Album
		 * @name description
		*/
		this.description = album.description || "";
	},
	
 	/**
	 * Zeigt ein Fenster an, in dem alle Fotos in diesem Album aufgelistet sind und welches dem Benutzer verschiedene
	 * Funktionen bietet. Siehe <a href="Gallery.Album.Window.htm">Gallery.Album.Window</a>.
	 * @memberof Gallery.Album
	*/
	show: function() {
		return new Gallery.Album.Window(this);
	},

 	/**
	 * Zeigt ein Fenster an, mit welchem der Benutzer neue Fotos zu dem Album hinzufügen kann. Wenn die Bilder 
	 * erfolgreich hochgeladen wurden, wird die Methode <a href="#_getPictures">_getPictures</a> aufgerufen, um die
	 * Liste der in diesem Album enthaltenen Fotos zu aktualisieren.
	 * @memberof Gallery.Album
	*/
	addPictures: function() {
		var uploadWindow = new Gallery.PictureUploadWindow(this.id);
		
		uploadWindow.on("uploadComplete", function() {
			this.pictures.load();
		}, this);
		
		return uploadWindow;
	},

 	/**
	 * Zeigt eine Dia-Show aller Fotos in diesem Album an.
	 * @memberof Gallery.Album
	*/
	startSlideShow: function() {
		return new Gallery.PictureViewer(this.pictures, 0, true);
	},

 	/**
	 * Ermöglicht es, das ganze Album in Form eines ZIP-Archivs herunterzuladen.
	 * @memberof Gallery.Album
	*/
	download: function() {
		var infoWindow = new Gallery.Album.DownloadWindow();
		
		var request = new JSONRPC.Request("gallery_downloadalbum", [this.id], { onSuccess: function(response) {
			infoWindow.close();
			window.location = response.result;
		}});
	}
}).addMethods(Observable);

/**
 * Das Fenster, in dem die Miniaturansichten aller Fotos in einem einzelnen Album angezeigt werden und das zudem
 * verschiedene weitere Funktionen bereitstellt.<br /><br />Beispielsweise hat der Benutzer in diesem Fenster die
 * Möglichkeit, die Fotos in diesem Album herunterzuladen, eine Dia-Show anzuzeigen oder - wenn er angemeldet ist -
 * weitere Fotos zum Album hinzuzufügen. Um das Ganze etwas übersichtlicher zu gestalten, werden die Fotos auf
 * verschiedene Seiten zu je 28 Fotos aufgeteilt.
 * @param {Gallery.Album} album Das Album, dessen Fotos angezeigt werden sollen
 * @class
 * @inherits Controls.Window
*/
Gallery.Album.Window = Class.create(Controls.Window, /** @scope Gallery.Album.Window */ {
	initialize: function($super, album, options) {
		/**
		 * Die Referenz auf das Album, dessen Fotos angezeigt werden.
		 * @type {Gallery.Album}
		 * @name album
		 * @memberof Gallery.Album.Window
		*/
		this.album = album;
		this.pictures = album.pictures;
		this.currentPage = 0;
		this.ready = false;
		this.setOptions({ picturesPerPage: 28 }, options);
		
		this._cachedEvents = [];
		
		if (!$super("AlbumWindow", { allowOnlyOne: true, title: this.album.name })) {
			return;
		}
		
		this.registerSubNode("hochladen", (function() {
				return this.album.addPictures();
			}).bind(this), {
				restrictedAccess: true
			}
		);
		
		this.registerSubNode("diashow", (function(state) {
				var index = 0;
				
				if (state) {
					this.pictures.each(function(picture, i) {
						if (picture.fileName === state.reduce()) {
							index = i;
						}
					});
				}
				
				return new Gallery.PictureViewer(this.pictures, index, !((state || []).reduce()));
			}).bind(this), {
				needsServerCommunication: true
			}
		);
		
		this.update("<h2>" + this.album.name + "</h2>");
		
		/**
		 * Die Schaltfläche, mit welcher der Benutzer den Dialog zum Hochladen von Fotos öffnen kann. Es ist nur
		 * anklickbar, wenn der Benutzer angemeldet ist.
		 * @type {Controls.Button}
		 * @name _addPicturesButton
		 * @memberof Gallery.Album.Window
		*/
		this._addPicturesButton = this.content.insertControl(new Controls.Button("Foto(s) hinzufügen",
			this.reportNavigation.bind(this, "hochladen"), {
				icon: new Sprite("smallIcons", 11),
				iconDisabled: new Sprite("smallIcons", 12),
				onlySignedIn: true,
				className: "addPicturesButton"
			}
		));

		/**
		 * Die Schaltfläche, mit welcher der Benutzer die Dia-Show starten kann. Sie wird erst aktiviert, sobald die
		 * Fotoliste geladen ist.
		 * @type {Controls.Button}
		 * @name _startSlideShowButton
		 * @memberof Gallery.Album.Window
		*/
		this._startSlideShowButton = this.content.insertControl(new Controls.Button("Diashow starten",
			this.reportNavigation.bind(this, "diashow"), {
				icon: new Sprite("smallIcons", 27),
				iconDisabled: new Sprite("smallIcons", 28),
				enabled: false,
				className: "slideShowButton"
			}
		));

		/**
		 * Die Schaltfläche, mit welcher der Benutzer die Fotos in diesem Album in Form einer ZIP-Datei herunterladen
		 * kann.
		 * @type {Controls.Button}
		 * @name _downloadButton
		 * @memberof Gallery.Album.Window
		*/
		this._downloadButton = this.content.insertControl(new Controls.Button("Bilder herunterladen",
			(function() {
				// Da die Generierung der ZIP-Datei eine gewisse Zeit dauert, könnte es passieren, dass der Benutzer
				// mehrmals auf die Schaltfläche klickt. Aus diesem Grund wird sie automatisch deaktiviert.
				this._downloadButton.disable();
				this.album.download();
			}).bind(this), {
				icon: new Sprite("smallIcons", 25),
				iconDisabled: new Sprite("smallIcons", 26),
				className: "downloadButton"
			}
		));

		/**
		 * Container, in dem die Miniaturansichten der Fotos angezeigt wird.
		 * @type {ExtendedHTMLObject}
		 * @name _thumbnailTable
		 * @memberof Gallery.Album.Window
		*/
		this._thumbnailTable = this.content.createChild({ className: "thumbnailTable" }).observe("click", (function(event) {
			var element = event.element();
			element = (element.hasClassName("thumbnailContainer")) ? element : element.up(".thumbnailContainer");
			
			if (element) {
				this.reportNavigation("diashow/" + element.readAttribute("name"));
			}
		}).bindAsEventListener(this));
		
		/**
		 * HTML-Element, das die Steuerelemente enthält, mit denen zwischen den einzelnen Fotoseiten gewechselt werden
		 * kann. Sollten das Album weniger als 28 Fotos enthalten, wird dieses Element nicht angezeigt.
		 * @type {ExtendedHTMLObject}
		 * @name _navigation
		 * @memberof Gallery.Album.Window
		*/
		this._navigation = this.content.createChild({ className: "navigation" }).hide();
		
		/**
		 * Die Schaltfläche, mit welcher der Benutzer zur vorherigen Seite wechseln kann.
		 * @type {Controls.Button}
		 * @name _previousButton
		 * @memberof Gallery.Album.Window
		*/		
		this._previousButton = this._navigation.insertControl(new Controls.Button("Vorherige Seite",
			this.showPreviousPage.bind(this), {
				enabled: false
			}
		));
		
		// Legt das Element an, in welche 
		this._navigation.createChild({ tag: "span", className: "currentPage" });
		
		/**
		 * Die Schaltfläche, mit welcher der Benutzer zur nächsten Seite wechseln kann.
		 * @type {Controls.Button}
		 * @name _nextButton
		 * @memberof Gallery.Album.Window
		*/
		this._nextButton = this._navigation.insertControl(new Controls.Button("Nächste Seite",
			this.showNextPage.bind(this), {
				enabled: false
			}
		));
		
		// Registriert die gerade angelegten Steuerelemente, damit sie korrekt entfernt werden, wenn das Fenster
		// geschlossen wird.
		this.registerChildControl(
			this._addPicturesButton,
			this._startSlideShowButton, 
			this._downloadButton,
			this._nextButton, 
			this._previousButton
		);
		
		// Wenn weitere Fotos hinzugefügt werden o. ä. wird die Tabelle mit den Miniaturansichten neu generiert.
		this._onExternalEvent(this.album, "updated", this._generatePictureTable, this);
		
		this.registerShortcut([Event.KEY_DOWN, Event.KEY_RIGHT], this.showNextPage, this);
		this.registerShortcut([Event.KEY_UP, Event.KEY_LEFT], this.showPreviousPage, this);
		
		// Wenn dies noch nicht geschehen ist, wird noch die Fotoliste für das Album geholt, ansonsten erfolgt
		// die Generierung der Tabelle schon jetzt.
		if (this.pictures.loaded) {
			this._generatePictureTable();
		} else if (!this.pictures.loading) {
			this.pictures.load();
		}
		
		// Wenn das Fenster geschlossen wird, soll auch ein möglicherweise offenes Hochlade-Fenster geschlossen werden.
		this.on("remove", function() {
			this._thumbnailTable.stopObserving("click");
		}, this);
		
		this.show();
	},
	
	showNextPage: function() {
		this.showPage(this.currentPage + 1);
	},
	
	showPreviousPage: function() {
		this.showPage(this.currentPage - 1);
	},
	
	showPage: function(index) {
		if (this.pictures.count() > index * this.options.picturesPerPage && index >= 0) {
			this.currentPage = index;
			this._generatePictureTable();
			
			this.reportNavigation((index === 0) ? "" : String(index + 1));
		}
	},
	
	/**
	 * Erzeugt die Liste der Miniaturansichten. 
	*/
	_generatePictureTable: function() {
		if (!this.ready) {
			this.fireEvent("subnodeready", "diashow");
			this.ready = true;
		}
		
		var picturesCount = this.pictures.count();
		
		this.currentPage = this.currentPage.limitTo(0, Math.floor(picturesCount / this.options.picturesPerPage));
		
		if (this.options.picturesPerPage < picturesCount) {
			this._previousButton[(this.currentPage > 0) ? "enable" : "disable"]();
			
			if (this.pictures.count() > (this.currentPage + 1) * this.options.picturesPerPage) {
				this._nextButton.enable();
			} else {
				this._nextButton.disable();
			}
			
			this.select(".currentPage")[0].innerHTML = "Seite " + (this.currentPage + 1) + " von " + 
				(Math.floor(picturesCount / this.options.picturesPerPage) + 1);
			
			this._navigation.show();
		} else {
			this._navigation.hide();
		}
		
		this._thumbnailTable.clear();
		
		if (picturesCount > 0) {
			this._thumbnailTable.innerHTML = this.pictures.eachSlice(this.options.picturesPerPage)[this.currentPage]
				.collect(function(picture, i) {
					return "<div class=\"thumbnailContainer\" name=\"" + picture.fileName +
						"\"><img src=\"" + picture.getThumbnailPath() + "\" />" +
						"<div class=\"fileName\">" + picture.fileName.truncate(18) + "</div></div>";
				}).join(" ");
			
			this._startSlideShowButton.enable();
		}
	},
	
	handleParamsChange: function(state) {
		var page = parseInt(state) || 1;
		
		if (this.ready) {
			this.showPage(page - 1);
		} else {
			this.currentPage = page - 1;
		}
	}
});

Gallery.Album.DownloadWindow = Class.create(Controls.Window, {
	initialize: function($super) {
		if (!$super("AlbumDownloadWindow", { onlyAllowOne: true, showTitleBar: false })) {
			return;
		}
		
		this.update("<h3>Bitte einen Moment Geduld...</h3>" +
			"<p>Die Fotos werden in ein Archiv gepackt. Dies kann einige Sekunden dauern.</p>");
		
		var progressBar = this.content.insertControl(new Controls.ProgressBar());
		var progress = 0;
		
		var animation = new PeriodicalExecuter(function() {
			progress += 0.1;
			
			if (progress > 1) {
				progress = 0;
			}
			
			progressBar.setProgress(progress);
		}, 0.3);
		
		this.registerChildControl(progressBar);
		
		this.on("remove", function() {
			animation.disable();
		});
		
		this.show();
	}
});

/**
 * Das Fenster, mit dem der Benutzer ein neues Album in der Fotogalerie erzeugen kann.
 * @class
 * @inherits Controls.Window
*/
Gallery.Album.CreationWindow = Class.create(Controls.Window, {
	initialize: function($super) {
		if (!$super("CreateAlbumWindow", { onlyAllowOne: true, showTitleBar: false })) {
			return;
		}
		
		// Der kurze Hilfetext und das Formular
        this.update("<h2>Neues Album erstellen</h2>" +
            "<p>Gib den Titel des neuen Albums ein und wahlweise auch eine kurze Beschreibung.</p>");
        
        this._form = this.content.insertControl(new Controls.Form({
			submitButtonText: "Album erstellen",
			submitButtonIcon: new Sprite("smallIcons", 6)
        }));
        
		this._form.add(
			new Controls.Form.TextField({
				caption: "Titel",
				name: "name"
			}),
			
			new Controls.Form.TextField({
				caption: "Beschreibung",
				name: "description",
				type: "textarea",
				allowBlank: true
			})
		);
        
        this._form.on("submit", this._submit, this);
        this.registerChildControl(this._form);
        
		this.show();
	},
	
	_submit: function(input) {
		if (Gallery.pluck("name").include(input.name)) {
			var msg = "Dieser Albumname wird bereits verwendet.";
			
			this._form.fields[0].markAsInvalid(msg);
			alert(msg);
			return false;
		}
		
		var request = new JSONRPC.Request("gallery_createalbum", [input.name, input.description || ""], {
			onSuccess: (function(response) {
				Gallery.add(new Gallery.Album(Object.extend({
					id: response.result,
					pictures: 0
				}, input)));
				
				Gallery.fireEvent("updated");
				this.close();
			}).bind(this)
		});
	}
});

/**
 * Enthält die Informationen zu einem einzelnen Foto in der Fotogalerie und bietet zudem einen bequemen Zugriff auf die
 * Pfadangaben der Miniatur- und Diashow-Version betreffenden Fotos.
 * @param {Integer} id Die ID des Fotos.
 * @param {String} fileName Der Dateiname des Fotos.
 * @param {Integer} userid Die ID der Benutzers, der das Foto hochgeladen hat.
 * @class
*/
Gallery.Picture = Class.create(/** @scope Gallery.Picture */ {
	initialize: function(picture) {
		/**
		 * Die ID des Fotos.
		 * @type Integer
		 * @name id
		 * @memberof Gallery.Picture
		*/
		this.id = picture.id;
		
		this._reloadParam = "";
		this.update(picture);
	},
	
	update: function(picture) {
		/**
		 * Der Dateiname des Fotos.
		 * @type String
		 * @name fileName
		 * @memberof Gallery.Picture
		*/
		this.fileName = picture.filename;
		
		/**
		 * Die ID der Benutzers, der das Foto hochgeladen hat.
		 * @type Integer
		 * @name userid
		 * @memberof Gallery.Picture
		*/
		this.userid = picture.userid;
		
		this.submitted = Date.fromTimestamp(picture.submitted);
		
		this.taken = Date.fromTimestamp(picture.taken);
	},
	
	/**
	 * Gibt den Pfad, wo sich die Miniaturversion des Fotos befindet, relativ zum Hauptverzeichnis zurück.
	 * @returns {String} Der Pfad zur Miniaturversion.
	 * @memberof Gallery.Picture
	*/
	getThumbnailPath: function() {
		return "gallery/thumbnails/" + this.fileName + "?" + this._reloadParam;
	},
	
	getPicturePath: function() {
		return "gallery/pictures/" + this.fileName + "?" + this._reloadParam;
	},
	
	rotate: function(degree, callBack) {
		if (this.isEditable()) {
			var request = new JSONRPC.Request("gallery_rotatepicture", [this.id, degree], {
				onSuccess: (function() {
					this.reload();
					this.fireEvent("edited", this);
					callBack();
				}).bind(this)
			});
		}
	},
	
	isEditable: function() {
		return User.signedIn && (User.isAdmin || User.id === this.userid);
	},
	
	reload: function() {
		this._reloadParam = Date.getCurrentTimestamp();
	}
}).addMethods(Observable);

Gallery.PictureViewer = Class.create(Controls.AutoResizingControl, {
	initialize: function($super, pictures, indexToDisplay, autoStartSlideShow) {
		this.pictures = pictures.toArray();
		this.currentIndex = 0;
		
		this._slideShowTimer = new PeriodicalExecuter(this.showNextPicture.bind(this), 4);
		this._slideShowTimer.disable();
		
		this.slideShowEnabled = false;
		
		$super($$("body")[0].createChild({ className: "pictureViewer" }), { height: 0, width: 0 });
		this.initializeHistoryNode();
		
		this._overlay = new Controls.AutoResizingControl($$("body")[0].createChild({ className: "pictureViewerOverlay" }), { height: 0, width: 0 });
		
		this._pictureContainer = this.element.createChild({ className: "pictureContainer" }).hide();
		this._pictureContainer.observe("click", this.showNextPicture.bind(this));
		
		this._pictureElement = this._pictureContainer.createChild({ tag: "img", className: "picture" });
		this._loadingElement = this._pictureContainer.createChild({ className: "loading" });
		this._commandContainer = this.element.createChild({ className: "commands" });
		
		this._previousButton = this._commandContainer.insertControl(new Controls.Button("",
			this.showPreviousPicture.bind(this), {
				icon: new Sprite("smallIcons", 33),
				title: "Vorheriges Foto"
			}
		));
		
		this._toggleSlideShowButton = this._commandContainer.insertControl(new Controls.Button("",
			this.toggleSlideShow.bind(this), {
				icon: new Sprite("smallIcons", 27),
				title: "Diashow starten/anhalten"
			}
		));
		
		this._nextButton = this._commandContainer.insertControl(new Controls.Button("",
			this.showNextPicture.bind(this), {
				icon: new Sprite("smallIcons", 32),
				title: "Nächstes Foto"
			}
		));
		
		this.registerChildControl(
			this._overlay,
			this._previousButton,
			this._toggleSlideShowButton,
			this._nextButton
		);
		
		this._closePictureViewerTab = this.element.createChild({ className: "topTab closePictureViewerTab" })
			.observe("click", this.remove.bind(this));
		
		var slideShowWasActive = false;
		
		this._pictureInfoTab = this.element.createChild({ className: "topTab pictureInfoTab" }).observe("click", (function() {
			if (App.Windows.hasWindowOfType("PictureInfoWindow")) {
				App.Windows.closeAllOfType("PictureInfoWindow");
			} else {
				if (this.slideShowEnabled) {
					this.stopSlideShow();
					slideShowWasActive = true;
				}
				
				var window = new Gallery.PictureInfoWindow(this.pictures[this.currentIndex], this);
				
				window.on("remove", function() {
					if (slideShowWasActive) {
						this.startSlideShow();
					}
				}, this);
			}
		}).bind(this));
		
		this._commandContainer.centerHorizontally();
		this.selectPicture(indexToDisplay || 0);
		
		if (autoStartSlideShow) {
			this.startSlideShow();
		}
		
		this.registerShortcut([Event.KEY_SPACE], this.toggleSlideShow, this);
		this.registerShortcut([Event.KEY_ESC], this.remove, this);
		this.registerShortcut([Event.KEY_DOWN, Event.KEY_RIGHT], this.showNextPicture, this);
		this.registerShortcut([Event.KEY_UP, Event.KEY_LEFT], this.showPreviousPicture, this);
		
		this.enableShortcuts();
		
		this.on("remove", function() {
			this.fireEvent("leave");
			this._overlay.remove();
			this._slideShowTimer.disable();
			App.Windows.closeAllOfType("PictureInfoWindow");
		}, this);
	},
	
	reloadCurrentPicture: function() {
		this.selectPicture(this.currentIndex, true);
	},
	
	selectPicture: function(index, forceReload) {
		this._loadingElement.show();
		
		var picture = this.pictures[index];
		var path = picture.getPicturePath() + ((forceReload) ? "?t=" + Date.getCurrentTimestamp() : "");
		var preloader = new Image();
		
		preloader.onload = (function() {
			if (Prototype.Browser.Gecko) {
				var previousSource = this._pictureElement.readAttribute("src");
			}
			
			this._pictureElement.writeAttribute("src", path);
			this._pictureContainer.show();
			
			if (Prototype.Browser.Gecko && !previousSource) {
				this._pictureContainer.setStyle({ opacity: 0.01 });
			}
			
			this._pictureContainer.centerOnScreen();
			
			if (Prototype.Browser.Gecko && !previousSource) {
				this._pictureContainer.setStyle({ opacity: 1.0 });
			}
			
			this.currentIndex = index;
			this._preloadPictures();
			
			if (this.currentIndex === 0) {
				this._previousButton.disable();
			} else {
				this._previousButton.enable();
			}
			
			if (this.currentIndex === (this.pictures.length - 1)) {
				this._nextButton.disable();
			} else {
				this._nextButton.enable();
			}
			
			preloader.onload = function() {};
			
			this._loadingElement.hide();
			
			this.fireEvent("selectPicture", picture);
		}).bind(this);
		
		preloader.src = path;
	},
	
	showNextPicture: function() {
		var index = (this.currentIndex === (this.pictures.length - 1)) ? 0 : (this.currentIndex + 1);
		
		if (this.slideShowEnabled) {
			this.selectPicture(index);
		} else {
			this.reportNavigation(this.pictures[index].fileName);
		}
	},
	
	showPreviousPicture: function() {
		var index = (this.currentIndex === 0) ? (this.pictures.length - 1) : (this.currentIndex - 1);
		
		if (this.slideShowEnabled) {
			this.selectPicture(index);
		} else {
			this.reportNavigation(this.pictures[index].fileName);
		}
	},
	
	startSlideShow: function() {
		this.slideShowEnabled = true;
		this._toggleSlideShowButton.setIcon(new Sprite("smallIcons", 29));
		this._slideShowTimer.enable();
		this.reportNavigation("");
		
		App.Windows.closeAllOfType("PictureInfoWindow");
	},
	
	stopSlideShow: function() {
		this.slideShowEnabled = false;
		this._toggleSlideShowButton.setIcon(new Sprite("smallIcons", 27));
		this._slideShowTimer.disable();
		this.reportNavigation(this.pictures[this.currentIndex].fileName);
	},
	
	toggleSlideShow: function() {
		if (this.slideShowEnabled) {
			this.stopSlideShow();
		} else {
			this.startSlideShow();
		}
	},
	
	_preloadPictures: function() {
		if ((this.pictures.length - 1) > this.currentIndex) {
			var preloader = new Image();
			preloader.src = this.pictures[this.currentIndex + 1].getPicturePath();
		}
		
		if (this.currentIndex > 0) {
			var preloader = new Image();
			preloader.src = this.pictures[this.currentIndex - 1].getPicturePath();
		}
	},
	
	handleParamsChange: function(state) {
		var index = -1;
		
		this.pictures.find(function(picture, i) {
			if (picture.fileName === state) {
				index = i;
				return true;
			}
		});
		
		if (index !== -1) {
			this.selectPicture(index);
		} else if (!this.slideShowEnabled) {
			this.startSlideShow();
		}
	}
}).addMethods(App.History.Node);

Gallery.PictureViewer.prototype.leave = Gallery.PictureViewer.prototype.remove;

Gallery.PictureInfoWindow = Class.create(Controls.Window, {
	initialize: function($super, picture, pictureViewer) {
		if (!$super("PictureInfoWindow", {
			onlyAllowOne: true, 
			showTitleBar: false,
			centerOnScreen: false,
			containerElement: pictureViewer.element
		})) {
			return;
		}
		
		this.update("<h2></h2><div></div><div><h3>Aktionen</h3></div>");
		
		this._title = this.content.select("h2")[0];
		this._infoContainer = this.content.select("div")[0];
		this._actionContainer = this.content.select("div")[1].hide();
		
		this.registerChildControl(this._actionContainer.insertControl(new Controls.Button(
			"Drehen im Uhrzeigersinn", (function() {
				this._childControls.invoke("disable");
				
				picture.rotate(-90, (function() {
					this._pictureViewer.reloadCurrentPicture();
					this._childControls.invoke("enable");
				}).bind(this));
			}).bind(this), {
				icon: new Sprite("smallIcons", 34)
			}
		)));
		
		this.registerChildControl(this._actionContainer.insertControl(new Controls.Button(
			"Drehen gegen den Uhrzeigersinn", (function() {
				this._childControls.invoke("disable");
				
				picture.rotate(90, (function() {
					this._pictureViewer.reloadCurrentPicture();
					this._childControls.invoke("enable");
				}).bind(this));
			}).bind(this), {
				icon: new Sprite("smallIcons", 35)
			}
		)));
		
		this._setPicture(picture);
		
		if (pictureViewer) {
			this._onExternalEvent(pictureViewer, "selectPicture", this._setPicture, this);
			this._pictureViewer = pictureViewer;
		}
		
		this.show();
	},
	
	_setPicture: function(picture) {
		this._title.innerHTML = picture.fileName.truncate(30);
		
		var contact = Contacts.get(picture.userid);
		var tmpl = new Template("<tr><td class=\"caption\">#{key}:</td><td>#{value}</td></tr>");
		var data = [
			{ key: "Hochgeladen von", value: contact.getFullName() },
			{ key: "Hochgeladen am", value: picture.submitted.format("j. F Y H:i") },
			{ key: "Aufgenommen am", value: picture.taken.format("j. F Y H:i") },
			{ key: "Originalfoto", value: "<a href=\"gallery/originals/" + picture.fileName +
				"\" target=\"_blank\">" + picture.fileName.truncate(25) + "</a>" }
		];
		
		this._infoContainer.innerHTML = "<table class=\"simpleList\">" + data.collect(tmpl.evaluate, tmpl).join("") +
			"</table>";
		
		this._actionContainer.setVisibility(picture.isEditable());
	}
});

Gallery.PictureUploadWindow = Class.create(Controls.Window, {
	initialize: function($super, albumid) {
		this.albumid = albumid;
		this.uploadInProgress = false;
		this.flashReady = false;
		this._progressElements = [];
		
		var title = "Foto(s) zu Album hinzufügen";
		
		if (!$super("PictureUploadWindow", { title: title })) {
			return;
		}
		
		this.registerSubNode("hinweis", function() {
			return new Gallery.PictureUploadNote();
		});
		
		(function() {
			if (!this.flashReady) {
				this.update("<h2>" + title + "</h2>" +
					"<p>Um Bilder zum Album hinzufügen zu können, muss auf deinem Rechner <a href=\"http://www.adobe.com/" +
					"shockwave/download/download.cgi?P1_Prod_Version=ShockwaveFlash&promoid=BIOW\" target=\"_blank\">Adobe " +
					"Flash 9.0</a> installiert sein.</p>");
			}
        }).bind(this).delay(1);
        
		this.flashUpload = new JSONRPC.Upload("gallery_uploadpicture", [this.albumid], {
			// Einstellungen zum Dateiupload
			file_types: 				    "*.jpg;*.jpeg;",
			file_types_description:         "Alle Bilddateien",
			file_upload_limit: 			    500,
			begin_upload_on_queue: 		    true
		});
		
		this.flashUpload.on("ready", this._ready, this);
		this.flashUpload.on("fileQueued", this._fileSelected, this);
		this.flashUpload.on("uploadProgress", this._fileProgress, this);
		this.flashUpload.on("uploadSuccess", this._fileUploadSucceeded, this);
		this.flashUpload.on("uploadFailure", this._fileUploadFailed, this);
		this.flashUpload.on("queueComplete", this._queueComplete, this);
		
		this.on("beforeremove", function() {
			if (this.uploadInProgress) {
				alert("Die Bilder wurden noch nicht vollständig hochgeladen. Bitte hab' noch einen Moment Geduld.");
				return false;
			}
		}, this);
		
		this.show();
	},
	
	_ready: function() {
		this.update("<h2>Foto(s) zu Album hinzufügen</h2>" +
			"<p>Klicke auf 'Durchsuchen...' und wähle die Bilder aus, die du hochladen " +
			"möchtest. Die Bilder werden dann automatisch hochgeladen und währenddessen kannst du sogar sogar " +
			"weitere Bilder zur Warteschlange hinzufügen.</p>");
		
		this._browseButton = this.content.insertControl(new Controls.Button("Durchsuchen...",
			this.flashUpload.browse.bind(this.flashUpload)));
		this._noteLink = this.content.insertControl(new Controls.Link("Bitte beachten!", this.reportNavigation.bind(this, "hinweis")));
		this.registerChildControl(this._browseButton, this._noteLink);
		
		this.content.insert("<h3>Warteschlange</h3><div class=\"progressContainer\"></div>");
		
		this.flashReady = true;
	},
	
	_fileSelected: function(file) {
		var progressCtrl = this.select(".progressContainer")[0].insertControl(new Gallery.PictureUploadWindow.ProgressInformation(file));
		
		this._progressElements.push(progressCtrl);
		this.registerChildControl(progressCtrl);
		
		this.uploadInProgress = true;
	},
	
	_fileProgress: function(file, bytesLoaded, bytesTotal) {
		this._progressElements.find(function(progressElement) {
			return progressElement.file.name === file.name
		}).setProgress(bytesLoaded / bytesTotal);
	},
	
	_fileUploadSucceeded: function(file, response) {
		this._progressElements.find(function(progressElement) {
			return progressElement.file.name == file.name
		}).markAsCompleted();
	},
	
	_fileUploadFailed: function(file, response) {
		this._progressElements.find(function(progressElement) {
			return progressElement.file.name == file.name
		}).markAsFailed(response.faultString);
	},
	
	_queueComplete: function() {
		this.uploadInProgress = false;
		this.fireEvent("uploadComplete");
	}
});

Gallery.PictureUploadNote = Class.create(Controls.Window, {
	initialize: function($super) {
		if (!$super("PictureUploadNoteWindow", { showTitleBar: false, onlyAllowOne: true })) {
			return;
		}
		
		this.update("<h3>Wichtiger Hinweis</h3><p>Da die Bilder moderner Digitalkameras auf Grund ihrer hohen Auflösung " +
			"oft mehrere Megabyte gross sind, dauert es trotz schnellen Internetanschlüssen eine gewisse Zeit bis ein " +
			"solches Bild vollständig hochgeladen ist.</p><p>Beispielsweise dauert das Hochladen 6-Megapixel-Bildes gut " +
			"und gerne eine Minute bei einem Internetanschluss mit 300 KBit/s Upstreamgeschwindigkeit.</p><p>Deshalb ist " +
			"es empfehlenswert, die hochzuladenden Bilder zuerst ein wenig zu verkleinern.</p>");
		
		this.show();
	}
});

Gallery.PictureUploadWindow.ProgressInformation = Class.create(Control, {
	initialize: function($super, file) {
		this.file = file;
		this.inProgress = false;
		
		$super(new Element("div", { className: "fileProgress" }));
		
		this.element.innerHTML = "<div><span class=\"fileName\">" + file.name + "</span> <span class=\"fileSize\">(" + 
			file.size.getFormatedDataSize() + ")</span></div>";
		
		this._statusText = this.element.createChild({ content: "In der Warteschlange" });
	},
	
	markAsCompleted: function() {
		if (this.progressBar) {
			this.progressBar.remove();
		}
		
		this.inProgress = false;
		this.removeClassName("inProgress");
		this.addClassName("completed");
		this._statusText.show().innerHTML = "Fertig";
	},
	
	markAsInProgress: function() {
		this.inProgress = true;
		this.addClassName("inProgress");
		this._statusText.hide();
		this.progressBar = this.element.insertControl(new Controls.ProgressBar());
	},
	
	markAsFailed: function(message) {
		if (this.progressBar) {
			this.progressBar.remove();
		}
	
		this.inProgress = false;
		this.removeClassName("inProgress");
		this.addClassName("failed");
		this._statusText.show().innerHTML = "<strong>Fehler</strong>: " + message;
	},
	
	setProgress: function(progress) {
		if (!this.inProgress) {
			this.markAsInProgress();
		}
		
		this.progressBar.setProgress(progress);
	}
});

/**
 * Definiert den Menüpunkt <em>Fotogalerie</em> im Klassenbuch, der eine Auflistung aller Alben enthält und dem
 * Benutzer mit einer Schaltfläche die Möglichkeit bietet, ein neues Album zur Fotogalerie hinzuzufügen.
 * @class
 * @inherits Controls.View
 * @todo Ereignis-Handler sollten korrekt deregistriert werden
*/
Gallery.View = Class.create(Controls.View, /** @scope Gallery.View */ {
	initialize: function($super) {
		// Legt den Menüpunkt an und erstellt die Überschrift 'Fotogalerie'
		// Die Darstellung der gesamten Aufgabenansicht kann mit der CSS-Klasse 'galleryView' gesteuert werden.	
		$super("Fotogalerie", new Sprite("fileTypesSmall", 4), "Fotogalerie", { className: "galleryView" });
		
		this.registerSubNode("neuesalbum", Gallery.createAlbum, { restrictedAccess: true });
		
		this.registerDynamicSubNode(
			function(nodeName) {
				return Gallery.find(function(album) {
					return album.name.addressify() == nodeName;
				}).show();
			},
			
			function(nodeName) {
				return Gallery.pluck("name").invoke("addressify").include(nodeName);
			}
		);
		
		// Um den Ladevorgang des Klassenbuchs nicht unnötig zu verlängern, wird das, was sich hinter dem Menüpunkt
		// "Fotogalerie" verbirgt, erst erstellt, wenn der Benutzer auch wirklich auf den Menüpunkt klickt.
		this.on("activate", function() {
			if (!this.initialized) {
				/**
				 * Die Schaltfläche, mit welcher der Benutzer das Fenster zum Erstellen eines neuen Albums
				 * (<a href="Gallery.Album.CreationWindow.htm">Gallery.Album.CreationWindow</a>) öffnen kann.
				 * @type {Controls.Button}
				 * @name _newAlbumButton
				 * @memberof Gallery.View
				*/
				this._newAlbumButton = this.additionalCommands.insertControl(new Controls.Button("Neues Album erstellen",
					this.reportNavigation.bind(this, "neuesalbum"), {
						onlySignedIn: true,
						icon: new Sprite("smallIcons", 6),
						iconDisabled: new Sprite("smallIcons", 7)
					}
				));
				
				this.registerChildControl(this._newAlbumButton);
				
				this._albumList = this.content.createChild({ className: "albumList" }).observe("click", (function(event) {
					var element = event.element();
					element = (element.hasClassName("albumLink")) ? element : element.up(".albumLink");
					
					if (element) {
						var albumId = parseInt(element.readAttribute("name").replace("album", ""));
						
						if (albumId) {
							this.reportNavigation(Gallery.get(albumId).name.addressify());
						}
					}
				}).bindAsEventListener(this));
				
				this.on("remove", function() {
					this._albumList.stopObserving("click");
				}, this);
				
				// Wenn die Albenliste neu vom Server geholt wird, soll auch die "grafische Albenliste" dieser Ansicht
				// aktualisiert werden
				Gallery.on("updated", this.update, this);
				this.update();
				
				this.initialized = true;
			}
		}, this);
	},
	
	/**
	 * Generiert eine grafische Albenliste, der sich auch entnehmen lässt, wie viele Fotos in den einzelnen Alben
	 * vorhanden sind. Wenn der Benutzer auf ein Album klickt, öffnet sich ein Fenster vom Typ
	 * <a href="Gallery.Album.Window.htm">Gallery.Album.Window</a>, in der alle Fotos im angeklickten Album angezeigt
	 * werden.
	 * @memberof Gallery.View
	*/
	update: function() {
		this._albumList.innerHTML = Gallery.collect(function(album) {
			var picturesCount = album.pictures.count();
			var numberStr = picturesCount + " Bilder";
			
			switch (picturesCount) {
				case 0: numberStr = "Keine Bilder"; break;
				case 1: numberStr = "Ein Bild"; break;
			}
			
			return "<div class=\"albumLink\" name=\"album" + album.id + "\"><div class=\"icon\"></div><div>" + 
				album.name + "</div><div class=\"pictures\">" + numberStr + "</div></div>";
		}).join(" ");
	}
});

// Bewirkt, dass beim Initialisieren des Klassenbuchs die Fotogalerie als Menüpunkt dem Klassenbuch hinzugefügt wird
App.on("initialize", function() { App.Menu.addTab(new Gallery.View()); });
