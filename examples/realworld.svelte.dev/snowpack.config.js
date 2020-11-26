// Consult https://www.snowpack.dev to learn about these options
module.exports = {
	extends: '@sveltejs/snowpack-config',
	installOptions: {
		externalPackage: [
			...Object.keys(require('./package.json').dependencies)
		]
	},
	mount: {
		'src/common': '/_app/common'
	},
	alias: {
		$common: './src/common'
	}
};