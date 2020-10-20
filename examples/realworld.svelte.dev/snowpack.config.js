// Consult https://www.snowpack.dev to learn about these options
module.exports = {
	extends: '@sveltejs/snowpack-config',
	mount: {
		'src/common': '/_app/common'
	},
	alias: {
		$app: '/_app/main',
		$common: './src/common'
	}
};