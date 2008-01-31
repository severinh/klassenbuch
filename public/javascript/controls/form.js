/*
 * Klassenbuch
 * Copyright (C) 2006 - 2008 Severin Heiniger
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

Controls.Form = Class.create(Control, {
	initialize: function($super, options) {
		this.setOptions({
			submitButtonText: "Senden",
			submitButtonIcon: null
		}, options);
		
		this.fields = [];
		this.buttons = [];
		
		$super(new Element("form", { className: "form", action: "javascript:void(null)" }));
		
		this._fieldsContainer = this.element.createChild();
		this._buttonContainer = this.element.createChild({ className: "buttons" });
		this.element.createChild({ className: "clearFloating" });
		
		this.addButton(new Controls.Button(this.options.submitButtonText, this._onSubmit.bind(this), {
			icon: this.options.submitButtonIcon
		}));
		
		var keyHandler = (function(event) {
			if (event.keyCode === Event.KEY_RETURN) {
				this._onSubmit();
			}
		}).bindAsEventListener(this);
		
		this.element.observe("keypress", keyHandler);
	},
	
	add: function() {
		$A(arguments).each(function(field) {
			this.fields.push(field);
			this._fieldsContainer.insertControl(field);
			this.registerChildControl(field);
		}, this);
		
		return this;
	},
	
	isValid: function() {
		return !this.fields.findAll(function(field) {
			return !field.validate(); 
		}, this).length;
	},
	
	getInput: function() {
		var input = {};
		
		this.fields.each(function(field) {
			input[field.name] = field.getProcessedValue();
		}, this);
		
		return input;
	},
	
	reset: function() {
		this.fields.invoke("reset");
	},
	
	disable: function() {
		this.fields.invoke("disable");
		this.buttons[0].disable();
	},
	
	enable: function() {
		this.fields.invoke("enable");
		this.buttons[0].enable();
	},
	
	addButton: function(button) {
		this._buttonContainer.insertControl(button);
		this.registerChildControl(button);
	},
	
	_onSubmit: function() {
		if (this.isValid()) {
			this.fireEvent("submit", this.getInput());
		}
	},
	
	focusFirstField: function() {
		this.element.focusFirstElement();
	}
});

Controls.Form.DataTypes = {
	mail: {
		isValid: function(value) {
			return value.isValidMailAddress();
		},
		
		invalidText: "Keine gültige E-Mailadresse angegeben"
	}
};

Controls.Form.Field = Class.create(Control, {
	initialize: function($super, fieldElement, options) {
		this.setOptions({
			defaultValue: "",
			caption: ""
		}, options);
		
		this.value = "";
		this.name = this.options.name || "field" + Controls.Form.Field.ANONYMOUS_ID++;
		this.fieldElement = fieldElement;
		
		$super(new Element("div", { className: "field" }));
		
		this._captionElement = this.element.createChild({
			tag: "label",
			content: this.options.caption + ":"
		});
		
		this.element.insert(this.fieldElement.addClassName("input"));
	},
	
	markAsInvalid: function(message) {
		message = message || "Der eingegebene Wert ist ungültig.";
		
		if (!this._invalidIcon) {
			this.element.insert(new Sprite("smallIcons", 20).toHTML("invalidIcon"));
			this._invalidIcon = this.select(".sprite").last().hide();
		}
		
		this._invalidIcon.writeAttribute("title", message).show();
		this.fireEvent("invalid", message);
	},
	
	markAsValid: function() {
		if (this._invalidIcon) {
			this._invalidIcon.hide();
		}
		
		this.fireEvent("valid");
	},
	
	setValue: function(value) {
		this.value = value;
		this.validate();
	},
	
	getProcessedValue: function() {
		return this.processValue(this.getValue());
	},
	
	getValue: function() {
		return this.value;
	},
	
	validateValue: function(value) {
		return true;
	},
	
	processValue: Prototype.K,
	
	validate: function() {
		if (this.validateValue(this.getProcessedValue())) {
			this.markAsValid();
			return true;
		}
		
		return false;
	},
	
	reset: function() {
		this.setValue(this.options.defaultValue);
		this.markAsValid();
		this.fireEvent("reset", this.options.defaultValue);
	},
	
	disable: function() {
		this.fieldElement.disable();
		return this;
	},
	
	enable: function() {
		this.fieldElement.enable();
		return this;
	}
});

Controls.Form.Field.ANONYMOUS_ID = 1;

Controls.Form.TextField = Class.create(Controls.Form.Field, {
	initialize: function($super, options) {
		options = Object.extend({
			type: "text",
			allowBlank: false,
			minLength: 0,
			dataType: ""
		}, options);
		
		if (options.type === "textarea") {
			$super(new Element("textarea"), options);
		} else {
			$super(new Element("input", { type: options.type }), options);
		}
	},
	
	setValue: function($super, value) {
		this.fieldElement.value = value;
		$super(value);
	},
	
	validateValue: function(value) {
        if (value.blank() && !this.options.allowBlank) {
			return this.markAsInvalid("Dieses Feld darf nicht leer sein.");
        }
        
        if (value.length < this.options.minLength) {
			return this.markAsInvalid("Muss mindestens " + this.options.minLength + " Zeichen lang sein.");
        }
        
        var dt = this.options.dataType;
        
        if (dt && Controls.Form.DataTypes[dt] && !Controls.Form.DataTypes[dt].isValid(value)) {
			return this.markAsInvalid(Controls.Form.DataTypes[dt].invalidText);
        }
        
        return true;
	},
	
	getValue: function() {
		return this.fieldElement.getValue();
	}
})

Controls.Form.Selection = Class.create(Controls.Form.Field, {
	initialize: function($super, items, options) {
		options = Object.extend({
			disabled: false
		}, options);
		
		$super(new Element("select", { disabled: options.disabled }), options);
		
		this.fieldElement.innerHTML = items.collect(function(item) {
			return "<option value=\"" + item + "\">" + item + "</option>";
		}).join("");
	},
	
	setValue: function($super, value) {
		this.fieldElement.value = value;
		$super(value);
	},
	
	getValue: function() {
		return this.fieldElement.getValue();
	}
});

Controls.Form.Calendar = Class.create(Controls.Form.Field, {
	initialize: function($super, options) {
		options = Object.extend({
			asTimestamp: false
		}, options);
		
		this.calendar = new Controls.Calendar(options);
		
		$super(this.calendar.element, options);
	},
	
	setValue: function($super, date) {
		this.calendar.setSelectedDate(date);
		$super((this.options.asTimestamp) ? date.getTimestamp() : date);
	},
	
	getValue: function() {
		var date = this.calendar.selectedDate;
		
		return (this.options.asTimestamp) ? date.getTimestamp() : date;
	},
	
	disable: Prototype.emptyFunction
});

Controls.Form.Checkbox = Class.create(Controls.Form.Field, {
	initialize: function($super, options) {
		options = Object.extend({
			checked: false
		}, options);
		
		$super(new Element("input", {
			className: "checkbox",
			type: "checkbox",
			checked: options.checked
		}), options);
	},
	
	setValue: function($super, value) {
		this.fieldElement.checked = (value) ? "checked" : "";
		$super(value);
	},
	
	getValue: function() {
		return this.fieldElement.checked;
	}
});