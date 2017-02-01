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

val akkaVersion = "2.4.16"
val akkaHttpVersion = "10.0.2"

lazy val netcdf = (project in file("netcdf"))
	.settings(commonSettings: _*)
	.settings(
		name := "data-netcdf",
		version := "0.1.0-SNAPSHOT",
		libraryDependencies ++= Seq(
			"edu.ucar"            % "cdm"                                % "4.5.5" excludeAll( //manually published on nexus.icos-cp.eu
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
			"com.typesafe.akka"   %% "akka-http-spray-json"              % akkaHttpVersion
		),
		publishTo := {
			val nexus = "https://repo.icos-cp.eu/content/repositories/"
			if (isSnapshot.value)
				Some("snapshots" at nexus + "snapshots")
			else
				Some("releases"  at nexus + "releases")
		},
		credentials += Credentials(Path.userHome / ".ivy2" / ".credentials")
	)

lazy val data = (project in file("."))
	.dependsOn(netcdf)
	.enablePlugins(SbtTwirl)
	.settings(commonSettings: _*)
	.settings(
		name := "data",
		version := "0.3.1",

		libraryDependencies ++= Seq(
			"com.typesafe.akka"  %% "akka-http-spray-json"               % akkaHttpVersion,
			"com.typesafe.akka"  %% "akka-slf4j"                         % akkaVersion,
			"ch.qos.logback"      % "logback-classic"                    % "1.1.3",
			"se.lu.nateko.cp"    %% "cpauth-core"                        % "0.5-SNAPSHOT",
			"se.lu.nateko.cp"    %% "meta-core"                          % "0.3.0-SNAPSHOT",
			"se.lu.nateko.cp"    %% "views-core"                         % "0.2-SNAPSHOT",

		// *** manually published on CP Nexus 3rd party repo ***
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

