const preprocess = require('svelte-preprocess');

module.exports = {
	// By default, `npm run build` will create a standard Node app.
	// You can create optimized builds for different platforms by
	// specifying a different adapter
	adapter: '@sveltejs/adapter-node',

	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: preprocess()
};