package se.lu.nateko.cp.data.utils

import se.lu.nateko.cp.meta.core.data.EnvriConfig

def printEnvriConf(conf: EnvriConfig): String =
	import spray.json.*
	import se.lu.nateko.cp.meta.core.MetaCoreConfig.given
	conf.toJson.prettyPrint
