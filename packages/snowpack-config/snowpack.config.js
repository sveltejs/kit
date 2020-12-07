const path = require('path');
const pkg = require(path.join(process.cwd(), 'package.json'));

// Consult https://www.snowpack.dev to learn about these options
module.exports = {
	install: ['svelte'],
	installOptions: {
		// ignore `import fs from 'fs'` etc
		externalPackage: [...require('module').builtinModules, ...Object.keys(pkg.dependencies || {})]
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
