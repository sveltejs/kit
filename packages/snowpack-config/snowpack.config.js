// Consult https://www.snowpack.dev to learn about these options
module.exports = {
	install: ['svelte'],
	installOptions: {
		// ignore `import fs from 'fs'` etc
		externalPackage: require('module').builtinModules
	},
	plugins: [
		[
			'@snowpack/plugin-svelte',
			{
				compilerOptions: {
					hydratable: true
				}
			}
		]
	],
	devOptions: {
		open: 'none',
		output: 'stream'
	},
	buildOptions: {
		sourceMaps: true
	},
	mount: {
		'.svelte/assets': `/${process.env.SVELTE_KIT_APP_DIR}/assets`
	},
	alias: {
		$app: './.svelte/assets/runtime/app'
	}
};
