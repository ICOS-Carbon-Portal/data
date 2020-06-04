import IcosCpSbtFrontendPlugin.JarResourceImport

scalaVersion in ThisBuild := "2.13.1"

lazy val commonSettings = Seq(
	organization := "se.lu.nateko.cp",

	scalacOptions ++= Seq(
		"-target:jvm-1.8",
		"-encoding", "UTF-8",
		"-unchecked",
		"-feature",
		"-deprecation",
		"-Wdead-code",
		"-Wnumeric-widen"
	),
	javacOptions ++= Seq("-source", "1.8", "-target", "1.8")
)

val akkaVersion = "2.6.3"
val akkaHttpVersion = "10.1.11"

lazy val netcdf = (project in file("netcdf"))
	.settings(commonSettings: _*)
	.settings(
		name := "data-netcdf",
		version := "0.1.4",
		libraryDependencies ++= Seq(
			//repo.icos-cp.eu acts as proxy to https://artifacts.unidata.ucar.edu
			"edu.ucar"            % "cdm"                                % "4.6.11" excludeAll(
				ExclusionRule(organization = "com.beust", name = "jcommander"),
				ExclusionRule(organization = "com.amazonaws", name = "aws-java-sdk-s3"),
				//ExclusionRule(organization = "com.google.guava", name = "guava"),
				ExclusionRule(organization = "org.quartz-scheduler", name = "quartz"),
				ExclusionRule(organization = "com.google.protobuf", name = "protobuf-java"),
				ExclusionRule(organization = "com.fasterxml.jackson.core"),
				//ExclusionRule(organization = "edu.ucar", name = "httpservices"),
				ExclusionRule(organization = "net.sf.ehcache", name = "ehcache-core"),
				ExclusionRule(organization = "org.apache.httpcomponents"),
				ExclusionRule(organization = "org.itadaki", name = "bzip2"),
				ExclusionRule(organization = "org.jdom", name = "jdom2"),
				ExclusionRule(organization = "org.quartz-scheduler", name = "quartz"),
				ExclusionRule(organization = "org.slf4j", name = "jcl-over-slf4j"),
				ExclusionRule(organization = "org.slf4j", name = "slf4j-api")
			),
			"com.typesafe.akka"   %% "akka-http-spray-json"              % akkaHttpVersion % "provided",
			"com.typesafe.akka"   %% "akka-stream"                       % akkaVersion     % "provided"
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


val metaCoreModule: ModuleID = "se.lu.nateko.cp" %% "meta-core" % "0.4.15"

val osName: String = System.getProperty("os.name") match {
	case name if name.startsWith("Linux") => "linux"
	case name if name.startsWith("Mac") => "mac"
	case name if name.startsWith("Windows") => "win"
	case _ => throw new Exception("Unknown platform!")
}

lazy val data = (project in file("."))
	.dependsOn(netcdf)
	.enablePlugins(SbtTwirl, IcosCpSbtDeployPlugin, IcosCpSbtFrontendPlugin)
	.settings(commonSettings: _*)
	.settings(
		name := "data",
		version := "0.4.8",

		Test / test := {
			(netcdf / Test / test).value
			(Test / test).value
		},
		cpFrontendApps := Seq("dygraph-light", "map-graph", "netcdf", "portal", "stats", "wdcgg", "dashboard"),
		cpFrontendBuildScript := "./build.sh",
		cpFrontendJarImports := Seq(
			JarResourceImport(metaCoreModule, "metacore.d.ts", cpFrontendCommonApp.value, "main/metacore.ts")
		),

		libraryDependencies ++= Seq(
			"com.typesafe.akka"  %% "akka-http-spray-json"               % akkaHttpVersion,
			"com.typesafe.akka"  %% "akka-stream"                        % akkaVersion,
			"com.typesafe.akka"  %% "akka-slf4j"                         % akkaVersion,
			"ch.qos.logback"      % "logback-classic"                    % "1.1.3",
			"se.lu.nateko.cp"    %% "cpauth-core"                        % "0.6.1",
			metaCoreModule,
			"se.lu.nateko.cp"    %% "views-core"                         % "0.4.3",
			"org.irods.jargon"    % "jargon-core"                        % "4.3.0.1-RELEASE", //IRODS client core features

			"org.openjfx"         % "javafx-base"      % "11" % "test" classifier osName,
			"org.openjfx"         % "javafx-controls"  % "11" % "test" classifier osName,
			"org.openjfx"         % "javafx-fxml"      % "11" % "test" classifier osName,
			"org.openjfx"         % "javafx-graphics"  % "11" % "test" classifier osName,
			"org.gillius"         % "jfxutils"         % "1.0" % "test",
			"org.scalatest"      %% "scalatest"        % "3.1.0" % "test"
		),

		fork in (Test, run) := true,

		logBuffered in Test := false,

		scalacOptions += "-Wunused:-imports",

		cpDeployTarget := "cpdata",
		cpDeployBuildInfoPackage := "se.lu.nateko.cp.cpdata",

		// Override the "assembly" command so that we always run "npm publish"
		// first - thus generating javascript files - before we package the
		// "fat" jarfile used for deployment.
		assembly := (Def.taskDyn{
			val original = assembly.taskValue
			// Referencing the task's 'value' field will trigger the npm command
			cpFrontendPublish.value
			// Then just return the original "assembly command"
			Def.task(original.value)
		}).value,

//		initialCommands in console := """
//			import se.lu.nateko.cp.data.api.B2Playground._
//		""",

//		cleanupCommands in console := """
//			stop()
//		"""
	)
