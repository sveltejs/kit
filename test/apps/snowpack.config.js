// Consult https://www.snowpack.dev to learn about these options
module.exports = {
	extends: '@sveltejs/snowpack-config',
	plugins: [
		[
			'@snowpack/plugin-svelte',
			{
				compilerOptions: {
					configFilePath: '../svelte.config.js',
					hydratable: true
				}
			}
		]
	]
};
