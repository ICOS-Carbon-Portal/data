name := "data"

version := "0.1"

scalaVersion := "2.11.7"

libraryDependencies ++= Seq(
	"com.typesafe.akka"  %% "akka-http-core-experimental"        % "2.0",
	"com.typesafe.akka"  %% "akka-http-spray-json-experimental"  % "2.0",
	"com.typesafe.akka"  %% "akka-slf4j"       % "2.3.14",
	"ch.qos.logback"      % "logback-classic"   % "1.1.2",
	"se.lu.nateko.cp"    %% "cpauth-core"       % "0.2",
	// *** manually published on CP Nexus 3rd party repo ***
	"edu.ucar"           % "cdm"               % "4.5.5" excludeAll(
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
)

scalacOptions ++= Seq(
  "-unchecked",
  "-deprecation",
  "-Xlint",
  "-Ywarn-dead-code",
  "-language:_",
  "-target:jvm-1.8",
  "-encoding", "UTF-8"
)

assemblyMergeStrategy in assembly := {
	case "application.conf" => MergeStrategy.concat
	case x => ((assemblyMergeStrategy in assembly).value)(x)
}

Revolver.settings
