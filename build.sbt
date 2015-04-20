name := "data"

version := "0.1"

scalaVersion := "2.11.6"

//resolvers += "UNIDATA Releases" at "https://artifacts.unidata.ucar.edu/content/repositories/unidata-releases/"

libraryDependencies ++= Seq(
	"edu.ucar"           % "cdm"               % "4.5.3",// intransitive(),
	"io.spray"           %% "spray-can"        % "1.3.3",
	"io.spray"           %% "spray-json"       % "1.3.1",
	"com.typesafe.akka"  %% "akka-actor"       % "2.3.9",
	"com.typesafe.akka"  %% "akka-slf4j"       % "2.3.9",
	"ch.qos.logback"     % "logback-classic"   % "1.1.2"
//	"org.scalatest"      %  "scalatest_2.11"   % "2.2.1" % "test"
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

Revolver.settings
