lazy val commonSettings = Seq(
	organization := "se.lu.nateko.cp",
	scalaVersion := "2.11.8",

	scalacOptions ++= Seq(
		"-unchecked",
		"-deprecation",
		"-Xlint",
		"-Ywarn-dead-code",
		"-language:_",
		"-target:jvm-1.8",
		"-encoding", "UTF-8"
	)
)

lazy val views = (project in file("views"))
	.settings(commonSettings: _*)
	.enablePlugins(SbtTwirl)
	.settings(
		name := "data-views",
		version := "0.1.0",
		libraryDependencies += "se.lu.nateko.cp" %% "views-core" % "0.1-SNAPSHOT"
	)

val akkaVersion = "2.4.10"

lazy val data = (project in file("."))
	.dependsOn(views)
	.settings(commonSettings: _*)
	.settings(
		name := "data",
		version := "0.2.1",

		libraryDependencies ++= Seq(
			"com.typesafe.akka"  %% "akka-http-spray-json-experimental"  % akkaVersion,
			"com.typesafe.akka"  %% "akka-slf4j"                         % akkaVersion,
			"ch.qos.logback"      % "logback-classic"                    % "1.1.3",
			"se.lu.nateko.cp"    %% "cpauth-core"                        % "0.5-SNAPSHOT",
			"se.lu.nateko.cp"    %% "meta-core"                          % "0.2.0-SNAPSHOT",

		// *** manually published on CP Nexus 3rd party repo ***

			"edu.ucar"            % "cdm"                                % "4.5.5" excludeAll(
				ExclusionRule(organization = "com.beust"),
				//ExclusionRule(organization = "com.google.guava"),
				ExclusionRule(organization = "com.google.protobuf"),
				ExclusionRule(organization = "net.sf.ehcache"),
				ExclusionRule(organization = "org.apache.httpcomponents"),
				ExclusionRule(organization = "org.itadaki"),
				ExclusionRule(organization = "org.jdom"),
				ExclusionRule(organization = "org.quartz-scheduler"),
				ExclusionRule(organization = "org.slf4j")
			),
			"org.irods.jargon"    % "jargon-core"      % "4.0.2.4", //IRODS client core features
			"org.globus.jglobus"  % "cog-jglobus"      % "1.8.0",   //jargon-core dependency
			"com.claymoresystems" % "puretls"          % "1.1",     //cog-jglobus dependency
			// other dependencies of jargon-core are commons-io and commons-codec,
			// but they are already present in this project transitively

		// *** end of manually published on CP Nexus 3rd party repo ***

			"org.scalatest"      %% "scalatest"        % "2.2.1" % "test"
		),

		initialCommands in console := """
			import se.lu.nateko.cp.data.MassUpload._
		""",

		cleanupCommands in console := """
			system.terminate()
		"""
	)

