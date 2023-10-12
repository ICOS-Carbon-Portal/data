'use strict';

const scalaClassDir = process.env.SCALA_CLASS_DIR;
if(!scalaClassDir){
	console.error(
		"SCALA_CLASS_DIR environment variable is not set. " +
		"Use classDirectory setting from SBT to get the value to set it to."
	);
	process.exit(1);
}

const buildTarget = scalaClassDir +  '/frontendapps/';

module.exports = {
	buildTarget
};
