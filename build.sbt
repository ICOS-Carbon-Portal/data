Global / onChangedBuildSource := ReloadOnSourceChanges

import IcosCpSbtFrontendPlugin.JarResourceImport

ThisBuild / scalaVersion := "3.1.1"

lazy val commonSettings = Seq(
	organization := "se.lu.nateko.cp",

	scalacOptions ++= Seq(
		"-Xtarget:11",
		"-encoding", "UTF-8",
		"-unchecked",
		"-feature",
		"-deprecation"
	),
	// javacOptions ++= Seq("-source", "1.8", "-target", "1.8")
)

val akkaVersion = "2.6.18"
val akkaHttpVersion = "10.2.8"

lazy val netcdf = (project in file("netcdf"))
	.settings(commonSettings: _*)
	.settings(
		name := "data-netcdf",
		version := "0.2.0",
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
			"com.typesafe.akka"   %% "akka-http-spray-json"              % akkaHttpVersion % "provided" cross CrossVersion.for3Use2_13,
			"com.typesafe.akka"   %% "akka-stream"                       % akkaVersion     % "provided" cross CrossVersion.for3Use2_13
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

val metaCoreModule: ModuleID = "se.lu.nateko.cp" %% "meta-core" % "0.6.13" cross CrossVersion.for3Use2_13

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
		version := "0.5.0",

		Test / test := {
			(netcdf / Test / test).value
			(Test / test).value
		},
		cpFrontendApps := Seq("dygraph-light", "map-graph", "netcdf", "portal", "stats", "dashboard"),
		cpFrontendBuildScript := "./build.sh",
		cpFrontendJarImports := Seq(
			JarResourceImport(metaCoreModule, "metacore.d.ts", cpFrontendCommonApp.value, "main/metacore.ts")
		),

		libraryDependencies := {
			libraryDependencies.value.map{
				case m if m.name.startsWith("twirl-api") =>
					m.cross(CrossVersion.for3Use2_13)
				case m => m
			}
		},

		libraryDependencies ++= Seq(
			"com.typesafe.akka"  %% "akka-http-spray-json"               % akkaHttpVersion cross CrossVersion.for3Use2_13,
			"com.typesafe.akka"  %% "akka-stream"                        % akkaVersion cross CrossVersion.for3Use2_13,
			"com.typesafe.akka"  %% "akka-slf4j"                         % akkaVersion cross CrossVersion.for3Use2_13,
			"ch.qos.logback"      % "logback-classic"                    % "1.1.3",
			"se.lu.nateko.cp"    %% "cpauth-core"                        % "0.6.5" cross CrossVersion.for3Use2_13,
			metaCoreModule,
			"se.lu.nateko.cp"    %% "views-core"                         % "0.4.8" cross CrossVersion.for3Use2_13 excludeAll(
				ExclusionRule.everything
			),
			"org.postgresql"      % "postgresql"                         % "42.2.12",
			"org.apache.commons"  % "commons-dbcp2"                      % "2.7.0",

			"org.openjfx"         % "javafx-base"      % "11" % "test" classifier osName,
			"org.openjfx"         % "javafx-controls"  % "11" % "test" classifier osName,
			"org.openjfx"         % "javafx-fxml"      % "11" % "test" classifier osName,
			"org.openjfx"         % "javafx-graphics"  % "11" % "test" classifier osName,
			"org.gillius"         % "jfxutils"         % "1.0" % "test",
			"org.scalatest"      %% "scalatest"        % "3.2.11" % "test" exclude("org.scala-lang.modules", "scala-xml_3")
		),

		Test /run / fork := true,

		Test / logBuffered := false,

		// scalacOptions += "-Wunused:-imports",

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
