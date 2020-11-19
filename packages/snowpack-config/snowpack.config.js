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
		'.svelte/main': '/_app/main',
		'src/components': '/_app/components',
		'src/routes': '/_app/routes',
		'src/setup': '/_app/setup'
	},
	alias: {
		$app: '/_app/main/runtime',
		$components: './src/components'
	}
};
