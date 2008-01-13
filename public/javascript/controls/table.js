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

Controls.Table = Class.create(Control, {
	initialize: function($super, options) {
		this.columns = [];
		this.rows = new Collection();
		this.sortedRows = [];
		
		this.sortAfterColumn = 0;
		this.highlightedRowId = "";
		this.sortDirection = "ascending";
		
		this.setOptions({
			cellpadding: "3px",
			enableRowHighlighting: true,
			continueHeader: true
		}, options);
		
		$super(new Element("div"));
		
		this.element.observe("mousedown", (function(event) {
			var element = event.findElement("th");
			
			if (element && element.hasClassName("sortableColumn")) {
				this.sort(element.readAttribute("name"), true);
				return;
			}
			
			if (this.options.enableRowHighlighting) {
				var element = event.findElement("tr");
				
				if (element && element.hasClassName("normalRow")) {
					this.highlightRow(element.readAttribute("name"));
				}
			}
		}).bindAsEventListener(this));
		
		this.element.observe("dblclick", (function(event) {
			var element = event.findElement("tr");
			
			if (element && element.hasClassName("normalRow")) {
				this.selectRow(element.readAttribute("name"))
			}
		}).bindAsEventListener(this));
		
		this.on("remove", this.clear, this);
	},
	
	addColumn: function(caption, getContent, options) {
		this.columns.push(new Controls.Table.Column(caption, getContent, options).connectTo(this));
	},
	
	addRows: function(rows) {
		rows.each(this.addRow, this);
	},
	
	addRow: function(row) {
		this.sortedRows.push(this.rows.add(row).id);
	},
	
	clear: function() {
		var highlightedRow = this.getHighlightedRow();
		var toKeep = this.options.keepHighlightedOnUpdate;
		
		if (highlightedRow && toKeep && highlightedRow[toKeep]) {
			this.oldHighlightedRowId = highlightedRow[toKeep];
		}
		
		this.highlightedRowId = "";
		this.rows.clear();
		this.sortedRows.clear();
		
		this.element.clear();
	},

	sort: function(value, byClick) {
		var index = -1;
		
		if (Object.isString(value)) {
			this.columns.each(function(column, i) {
				if (column.caption === value) {
					index = i;
				}
			});
		} else {
			index = value;
		}
		
		if (index >= 0 && index < this.columns.length) {
			var column = this.columns[index];
			
			if (column.sortable) {
				if (this.sortAfterColumn === index && column.allowReversedSorting && byClick) {
					this.sortDirection = (this.sortDirection === "ascending") ? "descending" : "ascending";
					this.sortedRows.reverse();
				} else {
					var toSort = [];
					
					var getContent = column.getContent;
					var sortMethod = column.sortMethod || null;
					var sortType   = column.sortType   || null;
					
					this.rows.each(function(row) {
						toSort.push({
							key: row.id,
							value: getContent(row) || ""
						});
					});
					
					toSort.sort(function(a, b) {
						return ((Object.isFunction(sortMethod)) ? sortMethod : Comparators[(sortType !== "normal") ? sortType : "string"])(a.value, b.value);
					});
					
					this.sortedRows = toSort.pluck("key");
					this.sortAfterColumn = index;
					
					if (column.standardSortDirection === "ascending") {
						this.sortDirection = "ascending";
					} else {
						this.sortedRows.reverse();
						this.sortDirection = "descending";
					}
				}
				
				this.fireEvent("sort", column.caption);
				this.refresh();
			}
		}
	},
	
	highlightRow: function(key) {
		if (key && this.rows.get(key)) {
			if (this.highlightedRowId) {
				this.select(".normalCellHighlighted").invoke("removeClassName", "normalCellHighlighted");
			}
			
			this.select("." + key).invoke("addClassName", "normalCellHighlighted");
			this.highlightedRowId = key;
			this.fireEvent("highlightRow", this.rows.get(key));
		}
	},
    
    selectRow: function(key) {
        this.fireEvent("selectRow", this.rows.get(key));
    },
	
	resort: function() {
		this.sort(this.sortAfterColumn);
	},
	
	getHighlightedRow: function() {
		return this.rows.get(this.highlightedRowId);
	},
	
	refresh: function() {
		var sortAfterColumn = this.sortAfterColumn;
		var sortDirection = this.sortDirection;
		var sortedColumn = this.columns[sortAfterColumn];
		var continueHeader = this.options.continueHeader;
		var outlookGroups = sortedColumn.showSortedInGroups === "outlookStyle";
		var mergedGroups = sortedColumn.showSortedInGroups === "mergeGroupCell";
		var groups = outlookGroups || mergedGroups;
		var enableRowHighlighting = this.options.enableRowHighlighting;
		
		var self = this;
		
		if (groups) {
			var groupHTML = ["<tr><td class=\"", "\" colspan=\"" + (this.columns.length + 
				((continueHeader) ? 1 : 0)) + "\">", "</td></tr>"];
			
			var mergedCellHTML = ["<td class=\"normalCell mergedCell\" rowspan=\"rowspanToReplace\"" +
				((sortAfterColumn === 0) ? " style=\"border-left: none;\"" : "") + ">", "</td>"];
		}
		
		var header = this.columns.collect(function(column, i) {
			if (column.visible && !(sortAfterColumn === i && outlookGroups)) {
				var content = (column.icon) ? column.icon.toHTML("columnIcon") : column.caption;
				var align = (column.centerColumnText) ? "center" : "left";
				var classNames = [];
				
				if (column.sortable) {
					classNames.push("sortableColumn");
				}
				
				if (sortAfterColumn === i && column.allowReversedSorting) {
					classNames.push("sorted");
					content = new Sprite("smallIcons", (sortDirection === "ascending") ? 18 : 19).toHTML("sortIcon") + content;
				}
				
				return "<th name=\"" + column.caption + "\" class=\"" + classNames.join(" ") + "\" style=\"width: " +
					column.width + "; text-align: " + align + ";\">" + content + "</th>";
			}
		}).join("");
		
		var output = "<tr class=\"tableHeader\">" + header + ((continueHeader) ? 
			"<th style=\"border: none;\">&nbsp;</th>" : "") + "</tr>";
		
		var lastSortContent = null;
		
		if (mergedGroups) {
			var mergedRowsRowspans = [];
		}
		
		this.sortedRows.each(function(id, i) {
			var rowHTML = ["<td class=\"normalCell " + ((enableRowHighlighting) ? 
				"highlightableCell " : "") + id + "\">", "</td>"];
			
			var currentRow = self.rows.get(id);
			var sortedColumnRowContent = sortedColumn.getContent(currentRow);
			
			if (sortedColumn.showSortedInGroups) {
				var newGroup = sortedColumnRowContent !== lastSortContent;
				
				if (Object.isFunction(sortedColumn.belongsToGroup)) {
					newGroup = !sortedColumn.belongsToGroup(sortedColumnRowContent, lastSortContent);
				}
				
				var content = "";
				var className = "";
				
				if (newGroup) {
					if (mergedGroups && i !== 0) {
						className = "tableGroupMergedDivider";
					} else if (outlookGroups) {
						className = "tableGroupOutlook";
						content = sortedColumn.processGroupCaption(sortedColumnRowContent);
					}
					
					if (className) {
						output += groupHTML[0] + className + groupHTML[1] + content + groupHTML[2];
					}
				}
				
				lastSortContent = sortedColumnRowContent;
			}
			
			var row = "<tr name=\"" + id + "\" class=\"normalRow\">";
			
			row += self.columns.collect(function(column, j) {
					if (column.visible) {
						if (!(j === sortAfterColumn && outlookGroups)) {
							var content = column.getContent(currentRow);
							
							content = (Object.isString(content) || Object.isNumber(content)) ?
								column.processCellContent(content, currentRow) : "&nbsp;";
							
							if (j === sortAfterColumn && mergedGroups) {
								if (newGroup) {
									mergedRowsRowspans.push(1);
									return mergedCellHTML[0] + content + mergedCellHTML[1];
								} else {
									++mergedRowsRowspans[mergedRowsRowspans.length - 1];
								}
							} else {
								return rowHTML[0] + content + rowHTML[1];
							}
						}
					}
				}).join("");
				
			row += ((continueHeader) ? rowHTML[0]  + "&nbsp;" + rowHTML[1] : "") + "</tr>";
			
			output += row;
		});
		
		if (mergedGroups) {
			mergedRowsRowspans.each(function(rowspan) {
				output = output.replace("rowspanToReplace", new String(rowspan));
			});
		}
		
		this.element.innerHTML = "<table class=\"table\" style=\"cellpadding=\"" + this.options.cellpadding + "\"><tbody>" +
			output + "</tbody></table>";
		
		this.fireEvent("refresh");
		
		if (enableRowHighlighting) {
			var toKeep = this.options.keepHighlightedOnUpdate;
			var oldKey = this.oldHighlightedRowId;
			
			
			if (!this.highlightedRowId && toKeep && oldKey) {
				var row = this.rows.find(function(row) {
					return row[toKeep] === oldKey;
				}, this);
				
				if (row) {
					this.highlightedRowId = row.key;
				}
				
				this.oldHighlightedRowId = null;
			}
			
			this.highlightRow(this.highlightedRowId);
		}
	}
});

Controls.Table.Column = Class.create({
	initialize: function(caption, getContent, options) {
		this.caption = caption;
		this.getContent = (Object.isString(getContent)) ? function(a) { return a[getContent]; } : getContent;
		
		Object.extend(this, options);
		
		this.processCellContent = (Object.isFunction(this.processCellContent)) ? this.processCellContent : Prototype.K;
		this.processGroupCaption = (Object.isFunction(this.processGroupCaption)) ? this.processGroupCaption : this.processCellContent;
		this.sortType = this.sortType || "normal";
		this.visible = (Object.isDefined(this.visible)) ? this.visible : true;
		this.standardSortDirection = this.standardSortDirection || "ascending";
		
		if (options.restricted)	{
			User.on("signIn", this.show, this);
			User.on("signOut", this.hide, this);
			
			this.visible = User.signedIn;
		}
	},
	
	show: function() {
		this.visible = true;
		this._table.refresh();
	},
	
	hide: function() {
		this.visible = false;
		this._table.refresh();
	},
	
	connectTo: function(table) {
		this._table = table;
		return this;
	}
});