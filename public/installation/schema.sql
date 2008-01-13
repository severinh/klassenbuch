SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";

--
-- Table structure for table `comments`
--

CREATE TABLE `kb_comments` (
  `id` smallint(6) NOT NULL auto_increment,
  `taskid` smallint(6) NOT NULL default '0',
  `userid` smallint(6) NOT NULL default '0',
  `date` double NOT NULL default '0',
  `comment` text collate utf8_unicode_ci NOT NULL,
  PRIMARY KEY  (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `files`
--

CREATE TABLE `kb_files` (
  `id` smallint(6) NOT NULL auto_increment,
  `name` text collate utf8_unicode_ci NOT NULL,
  `description` text collate utf8_unicode_ci,
  `size` int(12) NOT NULL default '0',
  `userid` smallint(6) NOT NULL default '0',
  `uploaded` double NOT NULL default '0',
  `forcedarchiving` tinyint(1) NOT NULL,
  PRIMARY KEY  (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `gallery_albums`
--

CREATE TABLE `kb_gallery_albums` (
  `id` int(11) NOT NULL auto_increment,
  `name` varchar(255) collate utf8_unicode_ci NOT NULL default '',
  `description` varchar(255) collate utf8_unicode_ci default NULL,
  `date` double NOT NULL default '0',
  PRIMARY KEY  (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `gallery_pictures`
--

CREATE TABLE `kb_gallery_pictures` (
  `id` int(11) NOT NULL auto_increment,
  `albumid` int(11) NOT NULL default '0',
  `filename` varchar(255) collate utf8_unicode_ci NOT NULL default '',
  `userid` int(11) NOT NULL default '0',
  `submitted` double NOT NULL default '0',
  `taken` double default NULL,
  PRIMARY KEY  (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `kb_messages` (
  `id` int(10) unsigned NOT NULL auto_increment,
  `userid` int(11) NOT NULL,
  `date` double NOT NULL,
  `text` text collate utf8_unicode_ci NOT NULL,
  `system` tinyint(1) NOT NULL,
  PRIMARY KEY  (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

CREATE TABLE `kb_subjects` (
  `id` int(10) unsigned NOT NULL auto_increment,
  `long` text collate utf8_unicode_ci NOT NULL,
  `short` text collate utf8_unicode_ci NOT NULL,
  PRIMARY KEY  (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tasks`
--

CREATE TABLE `kb_tasks` (
  `id` int(5) unsigned NOT NULL auto_increment,
  `date` double unsigned NOT NULL default '0',
  `subject` int(5) NOT NULL,
  `text` text collate utf8_unicode_ci NOT NULL,
  `important` tinyint(1) NOT NULL default '0',
  `userid` int(5) NOT NULL default '0',
  `added` double NOT NULL default '0',
  `commentsreadby` text collate utf8_unicode_ci,
  `doneby` text collate utf8_unicode_ci,
  `removed` tinyint(1) default NULL,
  PRIMARY KEY  (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `kb_users` (
  `id` int(5) NOT NULL auto_increment,
  `firstname` text collate utf8_unicode_ci NOT NULL,
  `surname` text collate utf8_unicode_ci NOT NULL,
  `nickname` text collate utf8_unicode_ci,
  `mail` text collate utf8_unicode_ci NOT NULL,
  `password` text collate utf8_unicode_ci,
  `address` text collate utf8_unicode_ci,
  `plz` int(11) default NULL,
  `location` text collate utf8_unicode_ci,
  `phone` text collate utf8_unicode_ci NOT NULL,
  `mobile` text collate utf8_unicode_ci,
  `classmember` tinyint(1) NOT NULL default '0',
  `mainsubject` text collate utf8_unicode_ci,
  `posts` int(11) default NULL,
  `newpassword` text collate utf8_unicode_ci,
  `newpasswordkey` text collate utf8_unicode_ci,
  `token` text collate utf8_unicode_ci NOT NULL,
  `settings` text collate utf8_unicode_ci NOT NULL,
  `isadmin` tinyint(1) NOT NULL,
  `lastcontact` double NOT NULL,
  `state` int(11) NOT NULL,
  PRIMARY KEY  (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
