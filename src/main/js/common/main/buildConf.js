const presets = [
	[
		"@babel/preset-env",
		{
			"targets": {
				"chrome": "60",
				"opera": "58",
				"edge": "11",
				"firefox": "68",
				"safari": "12"
			}
		}
	],
	[
		"@babel/preset-react"
	]
];

const applyProdEnvironment = cb => {
	process.env.NODE_ENV = 'production';
	return cb();
};

module.exports = {
	presets,
	applyProdEnvironment
};
