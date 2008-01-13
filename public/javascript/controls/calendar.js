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

Controls.Calendar = function() {
	var html = "<table cellpadding=\"0px\" cellspacing=\"0px\">" +
		"	<tr class=\"header\">" +
		"		<td>" + new Sprite("smallIcons", 23).toHTML("navigation") + "</td>" +
		"		<td colspan=\"5\"></td>" +
		"		<td>" + new Sprite("smallIcons", 24).toHTML("navigation") + "</td>" +
		"	</tr><tr>" +
		$R(0, 6).collect(function(w) {
			return "<td class=\"weekdays\">" + Date.weekdaysAbbr[w] + "</td>";
		}).join("") +
		"</tr></table><div class=\"content\"></div>";
	
	return Class.create(Control, {
		initialize: function($super, options) {
			this.setOptions({
				allowWeekends: true,
				allowPast: true
			}, options);
			
			$super(new Element("div", { className: "calendar" }));
			
			this.element.innerHTML = html;
			
			var navElements = this.select(".navigation");
			
			this.buttonPrevious = navElements[0].observe("mousedown", this.displayPreviousMonth.bind(this));
			this.buttonNext = navElements[1].observe("mousedown", this.displayNextMonth.bind(this));
			
			this.header	= this.select("td")[1];
			
			this.content = this.select(".content")[0].observe("click", (function(event) {
				var element = Event.element(event);
				var day = parseInt(element.innerHTML);
				
				if (element.hasClassName("selectableDay")) {
					var date = new Date(this.displayedYear, this.displayedMonth, day);
					
					if (!(this.selectedDate.getTimestamp() === date.getTimestamp())) {
						this.setSelectedDate(date);
					}
				}
			}).bindAsEventListener(this));
			
			this.setSelectedDate(this.options.initialDate || new Date().removeTime());
			
			this.on("remove", function() {
				this.buttonPrevious.stopObserving("mousedown");
				this.buttonNext.stopObserving("mousedown");
			}, this);
		},
		
		displayPreviousMonth: function() {
			var now = new Date();
			
			if (!this.options.allowPast && 
				this.displayedMonth === now.getMonth() &&
				this.displayedYear === now.getFullYear()) {
				return;
			}
			
			if (this.displayedMonth === 0) {
				this.displayedYear--;
				this.displayedMonth = 11;
			} else {
				this.displayedMonth--;
			}
			
			this.update();
		},
		
		displayNextMonth: function() {
			if (this.displayedMonth === 11) {
				this.displayedYear++;
				this.displayedMonth = 0;
			} else {
				this.displayedMonth++;
			}
			
			this.update();
		},
		
		setSelectedDate: function(date) {
			var todaysTimestamp = Date.getTodaysTimestamp();
			
			this.selectedDate = date;
			
			if (!this.options.allowPast && this.selectedDate.getTimestamp() < todaysTimestamp) {
				this.selectedDate.setTimestamp(todaysTimestamp);
			}
			
			var day = this.selectedDate.getDay();
			
			if (!this.options.allowWeekends && (day === 0 || day === 6)) {
				this.selectedDate.add((day === 0) ? 1 : 2, "days");
			}
			
			if (!new Date(this.displayedYear, this.displayedMonth, this.selectedDate.getDate()).equals(this.selectedDate)) {
				this.displayedMonth = this.selectedDate.getMonth();
				this.displayedYear = this.selectedDate.getFullYear();
				this.update();
			} else {
				this._highlightSelectedDay();
			}
		},
		
		_highlightSelectedDay: function() {
			this.select(".selectedDay").invoke("removeClassName", "selectedDay");
			this.select(".day" + this.selectedDate.getDate())[0].addClassName("selectedDay");
		},
		
		update: function() {
			var todaysTimestamp = Date.getTodaysTimestamp();
			var selectedTimestamp = this.selectedDate.getTimestamp();
			
			var firstWeekdayDay = new Date(this.displayedYear, this.displayedMonth, 1).getDay();
			
			var daysPerMonth = ((this.displayedMonth === 1) && (
				this.displayedYear % 400 === 0 || (
				this.displayedYear % 4 === 0 &&
				this.displayedYear % 100 !== 0))) ? 29 : Date.daysPerMonth[this.displayedMonth];
			
			var rows = 5;
			
			if ((daysPerMonth === 31 && firstWeekdayDay > 4) ||
				(daysPerMonth === 30 && firstWeekdayDay === 6)) {
				var rows = 6;
			} else if (daysPerMonth === 28 && firstWeekdayDay === 0) {
				var rows = 4;
			}
			
			this.content.clear();
			
			var output = "";
			
			for (var j = 0; j < rows; j++) {
				var row = "";
				
				for (var i = 1; i <= 7; i++) {
					var day = j * 7 + (i - firstWeekdayDay);
					var dayText = "";
					var classNames = [];
					
					if (day >= 1 && day <= daysPerMonth) {
						var dayObject = new Date(this.displayedYear, this.displayedMonth, day);
						var dayTimestamp = dayObject.getTimestamp();
						
						dayText = day;
						classNames.push("day" + day);
						
						if (dayTimestamp === todaysTimestamp) {
							classNames.push("today");
						}
						
						if (dayTimestamp === selectedTimestamp) {
							classNames.push("selectedDay");
						}
						
						var allowToSelect = !(this.options.allowWeekends === false && (i === 1 || i === 7));
						
						if (!this.options.allowPast && dayTimestamp < todaysTimestamp) {
							allowToSelect = false;
						}
						
						if (allowToSelect) {
							classNames.push("selectableDay");
						} else {
							classNames.push("disabledDay");
							
							if (classNames.include("today")) {
								classNames.push("todayDisabled");
							}
						}
					}
					
					row += "<td class=\"day " + classNames.join(" ") + "\">" + dayText + "</td>";
				}
				
				output += "<tr>" + row + "</tr>";
			}
			
			this.content.innerHTML = "<table cellspacing=\"0px\" cellpadding=\"0px\"><tbody>" + output + "</tbody></table>";
			this.header.innerHTML = Date.months[this.displayedMonth] + " " + this.displayedYear;
		}
	});
}();