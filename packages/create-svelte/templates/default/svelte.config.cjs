const sveltePreprocess = require('svelte-preprocess');
const pkg = require('./package.json');

const adapter = process.env.ADAPTER || '@sveltejs/adapter-node';
const options = JSON.parse(process.env.OPTIONS || '{}');

/** @type {import('@sveltejs/kit').Config} */
module.exports = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: sveltePreprocess(),

	kit: {
		// By default, `npm run build` will create a standard Node app.
		// You can create optimized builds for different platforms by
		// specifying a different adapter
		adapter: require(adapter)(options),

		// hydrate the <div id="svelte"> element in src/app.html
		target: '#svelte',

		vite: {
			ssr: {
				noExternal: Object.keys(pkg.dependencies || {})
			}
		}
	}
};
