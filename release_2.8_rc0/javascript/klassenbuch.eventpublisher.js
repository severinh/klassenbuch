/**
 * Eine abstrakte Basisklasse, die eine Möglichkeit bereitstellt, Ereignisse auszulösen. Über die Methode
 * <a href="#addListener">addListener</a> bzw. ihren Alias <a href="#on">on</a> kann ein bestimmtes Ereignis abgehört
 * werden. Mit <a href="#fireEvent">fireEvent</a> wird einbestimmtes Ereignis ausgelöst.<br /><br />Diese Klasse basiert
 * auf der Klasse <a href="http://www.someelement.com/2007/03/eventpublisher-custom-events-la-pubsub.html">EventPublisher
 * </a> von Ryan Dahl.
 * @class
 * @example
MyClass = ClassObsolete.create();
MyClass.inherits(EventPublisher, "EventPublisher");
MyClass.extend({
	initialize: function() {
		this.initializeEventPublisher();
	},
	
	saySomeThing: function() {
		this.fireEvent("say");
	}
});

var myInstance = new MyClass();
myInstance.on("say", function() {
	alert("myInstance hat etwas gesagt");
});
*/
var EventPublisher = Class.create( /** @scope EventPublisher.prototype */ {
    initialize: function() {
		/**
		 * Enthält alle Ereignis-Handler die mit der Methode <a href="#addListener">addListener</a> registriert wurden.
		 * Die Ereignis-Handler sind nach den dazugehörigen Ereignissen geordnet.
		 * @type Object
		 * @name _events
		 * @memberof EventPublisher
		*/
        this._events = {};
    },
    
    /**
     * Registriert einen Ereignis-Handler-Funktion zu einen bestimmten Ereignis, damit diese ausgeführt wird, wenn das 
     * Ereignis ausgelöst wird.
     * @param {String} eventName Der Name des Ereignisses, das abgehört werden soll.
     * @param {Function} handler Die Ereignis-Handler-Funktion, die ausgeführt werden soll.
     * @return {Function Die Ereignis-Handler-Funktion, um dessen späteres Entfernen zu erleichtern, wenn die Funktion
     * mit .bind(this) gekapselt wurde.
     * @memberof EventPublisher
    */
    addListener: function(eventName, handler, context) {
		handler = handler.bind(context);
		
		// Wenn zuvor noch kein Ereignis-Handler bei diesem Ereignis registriert worden ist.
        if (!this._events[eventName]) {
            this._events[eventName] = [];
        }
        
        // Fügt die Handler-Funktion ein
        this._events[eventName].push(handler);
        
        return handler;
    },

    /**
     * Entfernt einen bestimmten Ereignis-Handler von einemm bestimmten Ereignis
     * @param {String} eventName Das Ereignis, von welchem der Ereignis-Handler entfernt werden soll
     * @param {Function} handler Eine Referenz zur Handler-Funktion
     * @memberof EventPublisher
    */ 
    removeListener: function(name, handler) {
        if (this._events[name]) {
            this._events[name] = this._events[name].without(handler);
        }
    },
	
	removeListenersByEventName: function(name) {
		delete this._events[name];
	},
	
    /**
     * Entfernt alle Handler von allen Ereignissen (!).
     * @memberof EventPublisher
    */ 
    clearAllListeners: function() {
        this._events = {};
    },

    /**
    * Fires the event {eventName}, resulting in all registered handlers to be executed.
    * @param {String} eventName The name of the event to fire
    * @params {Object} args [optional] Any object, will be passed into the handler function as the only argument
    */
    fireEvent: function(eventName) {
		var args = $A(arguments);
		args.shift();
		
        if (this._events[eventName]) {
			return !this._events[eventName].any(function(handler) {
				try {
					if (handler.apply(this, args) === false) {
						return true;
					}
				} catch (e) {
					alert("Fehler in " + (this.id || "[unbekanntes Objekt]") + ".fireEvent():\n\nEreignis: " +
						eventName + "\nFehlermeldung: " + e.message);
				}
			}, this);
        }
        
        return true;
    }
});

EventPublisher.prototype.on = EventPublisher.prototype.addListener;
EventPublisher.prototype.un = EventPublisher.prototype.removeListener;