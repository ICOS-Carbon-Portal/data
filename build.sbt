import scala.sys.process.Process
import UnixProcessWithChildren.ExitHooksProcReplacementOpt

val defaultScala = "2.12.8"

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

val akkaVersion = "2.5.23"
val akkaHttpVersion = "10.1.8"

lazy val netcdf = (project in file("netcdf"))
	.settings(commonSettings: _*)
	.settings(
		name := "data-netcdf",
		version := "0.1.3-SNAPSHOT",
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

val frontentBuildProcKey = AttributeKey[UnixProcessWithChildren]("frontendBuildProcess")

def stopFrontendBuildProc(state: State): Unit = {
	val log = state.log
	state.get(frontentBuildProcKey).foreach{proc =>
		if(proc.isAlive) {
			log.info(s"Terminating the front end build process with PID ${proc.pid} (with children) and waiting for it to finish")
			proc.killAndWaitFor()
		}
		else log.info("The resident front end build process has already stopped")
	}
}

val frontend = Command.args("frontend", "install | build <app>"){(state, args) =>

	import java.io.File
	val log = state.log
	def projectDirectory(app: String) = new File(s"src/main/js/$app/")

	def stopAndStart(forApp: Option[String]) = {
		stopFrontendBuildProc(state)
		forApp.fold(state.remove(frontentBuildProcKey).copy(exitHooks = state.exitHooks.dropProcessKilling)){app =>
			val proc = UnixProcessWithChildren.run(projectDirectory(app), "bash", "-c", "./build.sh")

			state
				.put(frontentBuildProcKey, proc)
				.copy(
					exitHooks = state.exitHooks.replaceProcToKill(proc.exitHook)
				)
		}
	}

	args.toList match {
		case "install" :: app :: Nil if jsApps.contains(app) =>
			log.info(s"Install $app")
			val exitCode = Process("npm install", projectDirectory(app)).!
			if (exitCode == 0) {
				log.info("Finished npm install for " + app)
				state
			} else {
				log.error(s"npm install for $app failed")
				state.fail
			}

		case "build" :: app :: Nil if jsApps.contains(app) =>
			log.info(s"Start resident process building front-end app $app")
			stopAndStart(Some(app))

		case "stop" :: Nil =>
			log.info(s"Stopping resident front-end building process (if any)")
			stopAndStart(None)
		case _ =>
			log.error("Usage: frontend install <app> | build <app> | stop, where <app> is one of: " + jsApps.mkString(", "))
			state.fail
	}

}

val jsApps = Seq("dygraph-light", "map-graph", "netcdf", "portal", "stats", "wdcgg", "dashboard", "common")

val watchSourcesChanges = Seq(
		watchSources := {
			val projBase = baseDirectory.value
			watchSources.value.filterNot {src =>
				src.base == projBase
			}
		}
	)

val frontendPublish = taskKey[Unit]("Builds the front end apps from scratch")

frontendPublish := {
	import java.io.File
	val log = streams.value.log

	stopFrontendBuildProc(state.value)

	log.info("Starting front-end publish for common")
	Process("npm install", new File("src/main/js/common/")).!

	val errors: List[String] = new File("src/main/js/").listFiles.filter(_.getName != "common").par.map{pwd =>
			val projName = pwd.getName
		log.info("Starting front-end publish for " + projName)
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
		version := "0.4.7",

		libraryDependencies ++= Seq(
			"com.typesafe.akka"  %% "akka-http-spray-json"               % akkaHttpVersion,
			"com.typesafe.akka"  %% "akka-stream"                        % akkaVersion,
			"com.typesafe.akka"  %% "akka-slf4j"                         % akkaVersion,
			"ch.qos.logback"      % "logback-classic"                    % "1.1.3",
			"se.lu.nateko.cp"    %% "cpauth-core"                        % "0.6.0-SNAPSHOT",
			"se.lu.nateko.cp"    %% "meta-core"                          % "0.4.3-SNAPSHOT",
			"se.lu.nateko.cp"    %% "views-core"                         % "0.4.1-SNAPSHOT",
			"org.irods.jargon"    % "jargon-core"                        % "4.3.0.1-RELEASE", //IRODS client core features

			"org.gillius"         % "jfxutils"         % "1.0"   % "test",
			"org.scalatest"      %% "scalatest"        % "3.0.3" % "test"
		),

		fork in (Test, run) := true,

		logBuffered in Test := false,

		scalacOptions += "-Ywarn-unused-import:false",

		cpDeployTarget := "cpdata",
		cpDeployBuildInfoPackage := "se.lu.nateko.cp.cpdata",

		commands += frontend,

		// Override the "assembly" command so that we always run "npm publish"
		// first - thus generating javascript files - before we package the
		// "fat" jarfile used for deployment.
		assembly := (Def.taskDyn{
			val original = assembly.taskValue
			// Referencing the task's 'value' field will trigger the npm command
			frontendPublish.value
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
