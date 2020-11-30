// Consult https://www.snowpack.dev to learn about these options
module.exports = {
	extends: '@sveltejs/snowpack-config',
	mount: {
		'source/components': '/components'
	},
	alias: {
		'$components': './source/components'
	}
};
