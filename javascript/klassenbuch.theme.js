App.ThemeManager = Object.extend(new EventPublisher(), {
	initialize: function() {
		var updateTheme = function() {
			App.ThemeManager.setTheme(User.getSetting("theme"));
		};
		
		User.on("signIn", updateTheme);
		User.on("signOut", updateTheme);
	},
	
	switchTheme: function(theme) {
		$$("link")[0].writeAttribute("href", "design/" + theme + "/css/design.css");
		App.ThemeManager.currentTheme = theme;
		App.ThemeManager.fireEvent("changetheme", theme)
	},
	
	setTheme: function(theme) {
		if (theme !== App.ThemeManager.currentTheme && App.ThemeManager.availableThemes[theme]) {
			App.ThemeManager.switchTheme(theme);
		}
	},
	
	currentTheme: User.settings.theme,	
	
	availableThemes: $H({
		"default": "Standard-Design",
		"nonzero": "nonZero"
	})
});

App.on("initialize", App.ThemeManager.initialize);