Global / onChangedBuildSource := ReloadOnSourceChanges

import IcosCpSbtFrontendPlugin.JarResourceImport

ThisBuild / scalaVersion := "3.3.4"

lazy val commonSettings = Seq(
	organization := "se.lu.nateko.cp",

	scalacOptions ++= Seq(
		"-Xtarget:11",
		"-encoding", "UTF-8",
		"-unchecked",
		"-feature",
		"-deprecation"
	),
	javacOptions ++= Seq("-Xlint:deprecation")
)

val akkaVersion = "2.6.19"
val akkaHttpVersion = "10.2.8"

lazy val netcdf = (project in file("netcdf"))
	.settings(commonSettings: _*)
	.settings(
		name := "data-netcdf",
		version := "0.3.1",
		libraryDependencies ++= Seq(
			//dependency comes from unidata-repo: https://artifacts.unidata.ucar.edu/repository/unidata-all (see project/repositories)
			"edu.ucar"            % "cdm-core"                            % "5.5.3" excludeAll(
				ExclusionRule(organization = "com.beust", name = "jcommander"),
				ExclusionRule(organization = "com.google.protobuf", name = "protobuf-java"),
				ExclusionRule(organization = "edu.ucar", name = "httpservices"),
				// ExclusionRule(organization = "org.apache.httpcomponents"),
				ExclusionRule(organization = "org.jdom", name = "jdom2"),
			),
			"com.typesafe.akka"   %% "akka-http-spray-json"              % akkaHttpVersion % "provided" excludeAll("io.spray") cross CrossVersion.for3Use2_13,
			"com.typesafe.akka"   %% "akka-stream"                       % akkaVersion     % "provided" cross CrossVersion.for3Use2_13,
			"io.spray"            %% "spray-json"                        % "1.3.6"
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

val metaCoreModule: ModuleID = "se.lu.nateko.cp" %% "meta-core" % "0.7.20"

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
		version := "0.6.1",

		cpFrontendApps := Seq("dygraph-light", "map-graph", "netcdf", "portal", "stats", "dashboard"),
		cpFrontendBuildCommand := {
			val targetDir = (Compile / classDirectory).value.getAbsolutePath
			s"""export SCALA_CLASS_DIR="${targetDir}" && npm run build"""
		},
		cpFrontendPublishCommand := {
			val targetDir = (Compile / classDirectory).value.getAbsolutePath
			s"""export SCALA_CLASS_DIR="${targetDir}" && npm run publish"""
		},
		cpFrontendJarImports := Seq(
			JarResourceImport(metaCoreModule, "metacore.d.ts", cpFrontendCommonApp.value, "main/metacore.ts"),
			JarResourceImport(metaCoreModule, "metacore.py", cpFrontendCommonApp.value, "../../python/icoscp_core/src/icoscp_core/metacore.py")
		),

		libraryDependencies ++= Seq(
			"com.typesafe.akka"  %% "akka-slf4j"                         % akkaVersion cross CrossVersion.for3Use2_13,
			"ch.qos.logback"      % "logback-classic"                    % "1.1.3",
			"eu.icoscp"          %% "georestheart"                       % "0.1.0",
			metaCoreModule,
			"se.lu.nateko.cp"    %% "views-core"                         % "0.7.16",
			"se.lu.nateko.cp"    %% "cpauth-core"                        % "0.10.1", //to force newer version
			"org.postgresql"      % "postgresql"                         % "42.6.0",
			"org.apache.commons"  % "commons-dbcp2"                      % "2.7.0",

			"org.openjfx"         % "javafx-base"      % "11" % "test" classifier osName,
			"org.openjfx"         % "javafx-controls"  % "11" % "test" classifier osName,
			"org.openjfx"         % "javafx-fxml"      % "11" % "test" classifier osName,
			"org.openjfx"         % "javafx-graphics"  % "11" % "test" classifier osName,
			"org.gillius"         % "jfxutils"         % "1.0" % "test",
			"org.locationtech.jts" % "jts-core"        % "1.19.0" % "test",
			"org.scalatest"      %% "scalatest"        % "3.2.11" % "test"
		),

		Test /run / fork := true,

		Test / logBuffered := false,

		// scalacOptions += "-Wunused:-imports",

		cpDeployTarget := "cpdata",
		cpDeployBuildInfoPackage := "se.lu.nateko.cp.cpdata",
		cpDeployPreAssembly := Def.sequential(
			netcdf / clean,
			clean,
			netcdf / Test / test,
			Test / test,
			cpFrontendPublish
		).value,
		cpDeployPlaybook := "core.yml",
		cpDeployPermittedInventories := Some(Seq("staging", "cities", "production")),
		cpDeployInfraBranch := "master",

//		initialCommands in console := """
//			import se.lu.nateko.cp.data.api.B2Playground._
//		""",

//		cleanupCommands in console := """
//			stop()
//		"""
	)
