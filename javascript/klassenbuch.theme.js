App.ThemeManager = new (Class.create(EventPublisher, {
	initialize: function($super) {
		$super();
		
		var updateTheme = function() {
			this.setTheme(User.settings.get("theme"));
		};
		
		App.on("beforeInitialize", function() {
			User.on("signIn", updateTheme, this);
			User.on("signOut", updateTheme, this);
		}, this);
	},
	
	switchTheme: function(theme) {
		$$("link")[1].writeAttribute("href", "design/" + theme + "/css/design.css");
		this.currentTheme = theme;
		this.fireEvent("changetheme", theme);
	},
	
	setTheme: function(theme) {
		if (theme !== this.currentTheme && this.availableThemes.get(theme)) {
			this.switchTheme(theme);
		}
	},
	
	currentTheme: User.settings.get("theme"),
	
	availableThemes: $H({
		"default": "Standard-Design",
		"nonzero": "nonZero"
	})
}))();
