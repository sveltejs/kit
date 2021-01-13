const path = require('path');
const pkg = require(path.join(process.cwd(), 'package.json'));

// Consult https://www.snowpack.dev to learn about these options
module.exports = {
	packageOptions: {
		// always include Svelte in your project
		knownEntrypoints: ['svelte'],
		// ignore `import fs from 'fs'` etc
		external: [...require('module').builtinModules, ...Object.keys(pkg.dependencies || {})]
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
		sourcemap: true
	},
	mount: {
		'.svelte/assets': `/${process.env.SVELTE_KIT_APP_DIR}/assets`
	},
	alias: {
		$app: './.svelte/assets/runtime/app'
	}
};
