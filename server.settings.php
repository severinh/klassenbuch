<?php

// Auf diese Datei ist kein direkter Zugriff erlaubt.
defined("_KBSECURE") or die("Zugriff verweigert.");

$settings = Array();

$settings["db"] = Array(
	"server" 	=> "localhost",
 	"name"		=> "",
	"user" 		=> "",
	"password" 	=> "",
	"prefix" 	=> ""
);

$settings["gen"] = Array(
	"online" => true,
	"cookieprefix" => "kb_",
	"adminmail" => "severinheiniger@gmail.com"
);

$settings["upload"] = Array();
$settings["upload"]["online"] = true;
$settings["upload"]["extblacklist"] = Array("exe", "scr", "dll", "msi", "vbs", "bat", "com", "pif", "cmd");
$settings["upload"]["maxsize"] = 10485760;

?>