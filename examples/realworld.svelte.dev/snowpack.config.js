// Consult https://www.snowpack.dev to learn about these options
module.exports = {
	extends: '@sveltejs/snowpack-config',
	packageOptions: {
		external: [...Object.keys(require('./package.json').dependencies)]
	},
	mount: {
		'src/components': '/_components',
		'src/common': '/common'
	},
	alias: {
		$common: './src/common',
		$components: './src/components'
	}
};
