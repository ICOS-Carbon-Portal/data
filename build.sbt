val defaultScala = "2.12.7"

//watchService in ThisBuild := (() => new sbt.io.PollingWatchService(pollInterval.value)) //SBT bug

lazy val commonSettings = Seq(
	organization := "se.lu.nateko.cp",
	scalaVersion := defaultScala,

	scalacOptions ++= Seq(
		"-target:jvm-1.8",
		"-encoding", "UTF-8",
		"-unchecked",
		"-feature",
		"-deprecation",
		"-Xfuture",
		"-Yno-adapted-args",
		"-Ywarn-dead-code",
		"-Ywarn-numeric-widen",
		"-Ywarn-unused"
	),
	javacOptions ++= Seq("-source", "1.8", "-target", "1.8")
)

val akkaVersion = "2.5.17"
val akkaHttpVersion = "10.1.5"

lazy val netcdf = (project in file("netcdf"))
	.settings(commonSettings: _*)
	.settings(
		name := "data-netcdf",
		version := "0.1.2-SNAPSHOT",
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
		crossScalaVersions := Seq(defaultScala, "2.11.11"),
		credentials += Credentials(Path.userHome / ".ivy2" / ".credentials")
	)


val frontend = inputKey[Unit]("Builds the frontend")

frontend := Def.inputTaskDyn {
	import scala.sys.process.Process
	import java.io.File
	val log = streams.value.log

	val args: Seq[String] = sbt.Def.spaceDelimited().parsed

	args.toList match {
		case "build" :: app :: Nil =>
			log.info(s"Build $app")
			val projectDirectory = new File(s"src/main/js/$app/")
			val exitCode = (Process("npm install", projectDirectory) #&& Process("npm run build", projectDirectory)).!
			if (exitCode == 0) {
				log.info("Finished front-end build for " + app)
			} else {
				log.error(s"Front-end build for $app failed")
			}
		case _ =>
			log.info("Usage: frontend build <app>, where app is one of: " + jsApps.mkString(", "))
	}
	log.info("Copying resources folder contents to target")
	copyResources in Compile
}.evaluated


val jsApps = Seq("dygraph-light", "map-graph", "netcdf", "portal", "stats", "wdcgg")

def compiledJsFilter(resourceFolder: java.nio.file.Path) = new SimpleFileFilter(file => {
    val path = file.toPath
	val isCompiledJs = jsApps.exists(nameBase => path.startsWith(resourceFolder) && file.getName.startsWith(nameBase + ".js"))
    val isCompiledStyleFile = path.startsWith(resourceFolder.resolve("style"))
	isCompiledJs || isCompiledStyleFile
})

val intellijSaveTmpFilter = new SimpleFileFilter(file => {
    val fn = file.getName
    fn.endsWith("___jb_tmp___") || fn.endsWith("___jb_old___")
}) || HiddenFileFilter

val watchSourcesChanges = Seq(
		watchSources := {
			val resFolder = (Compile / resourceDirectory).value
			watchSources.value.filterNot { _.base == resFolder }
		},
		watchSources += {
			val resFolder = (Compile / resourceDirectory).value
			WatchSource(resFolder, AllPassFilter, compiledJsFilter(resFolder.toPath))
		},
	) ++ jsApps.map { app =>
		watchSources += WatchSource((Compile / sourceDirectory).value / "js" / app / "main", AllPassFilter, intellijSaveTmpFilter)
	}

val frontendBuild = taskKey[Unit]("Builds the front end apps")

frontendBuild := {
	import scala.sys.process.Process
	import java.io.File
	val log = streams.value.log

	log.info("Starting front-end build for common")
	Process("npm install", new File("src/main/js/common/")).!

	val errors: List[String] = new File("src/main/js/").listFiles.filter(_.getName != "common").par.map{pwd =>
			val projName = pwd.getName
		log.info("Starting front-end build for " + projName)
		val exitCode = (Process("npm install", pwd) #&& Process("npm run publish", pwd)).!

		if(exitCode == 0) {
			log.info("Finished front-end build for " + projName)
			None
		}else {
			log.error(s"Front-end build for $projName failed")
			Some(s"Front end building for $projName returned non-zero exit code $exitCode")
		}
	}.toList.flatten

	if(errors.isEmpty)
		log.info("Front end builds are complete!")
	else
		throw new Exception(errors.mkString("\n"))
}

lazy val data = (project in file("."))
	.dependsOn(netcdf)
	.enablePlugins(SbtTwirl,IcosCpSbtDeployPlugin)
	.settings(commonSettings: _*)
	.settings(
		name := "data",
		version := "0.4.5",

		libraryDependencies ++= Seq(
			"com.typesafe.akka"  %% "akka-http-spray-json"               % akkaHttpVersion,
			"com.typesafe.akka"  %% "akka-stream"                        % akkaVersion,
			"com.typesafe.akka"  %% "akka-slf4j"                         % akkaVersion,
			"ch.qos.logback"      % "logback-classic"                    % "1.1.3",
			"se.lu.nateko.cp"    %% "cpauth-core"                        % "0.6.0-SNAPSHOT",
			"se.lu.nateko.cp"    %% "meta-core"                          % "0.3.11-SNAPSHOT",
			"se.lu.nateko.cp"    %% "views-core"                         % "0.4.0-SNAPSHOT",
			"org.irods.jargon"    % "jargon-core"                        % "4.3.0.1-RELEASE", //IRODS client core features

			"org.gillius"         % "jfxutils"         % "1.0"   % "test",
			"org.scalatest"      %% "scalatest"        % "3.0.3" % "test"
		),

		fork in (Test, run) := true,

		logBuffered in Test := false,

		scalacOptions += "-Ywarn-unused-import:false",

		cpDeployTarget := "cpdata",
		cpDeployBuildInfoPackage := "se.lu.nateko.cp.cpdata",

		// Override the "assembly" command so that we always run "npm publish"
		// first - thus generating javascript files - before we package the
		// "fat" jarfile used for deployment.
		assembly := (Def.taskDyn{
			val original = assembly.taskValue
			// Referencing the task's 'value' field will trigger the npm command
			frontendBuild.value
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
	.settings(watchSourcesChanges)

