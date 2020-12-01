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
		open: 'none'
	},
	buildOptions: {
		sourceMaps: true
	},
	mount: {
		'.svelte/assets': '/_app/assets'
	},
	alias: {
		$app: './.svelte/assets/runtime/app'
	}
};
