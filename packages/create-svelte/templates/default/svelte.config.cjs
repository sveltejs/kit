const sveltePreprocess = require('svelte-preprocess');
const pkg = require('./package.json');

const adapter = process.env.ADAPTER;
const options = JSON.parse(process.env.OPTIONS || '{}');

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: sveltePreprocess(),

	kit: {
		// hydrate the <div id="svelte"> element in src/app.html
		target: '#svelte'
	}
};

config.kit.adapter = require('./adapter-netlify')(options);

module.exports = config;
