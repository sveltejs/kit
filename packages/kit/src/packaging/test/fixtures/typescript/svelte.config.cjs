const preprocess = require('svelte-preprocess');

module.exports = {
	preprocess: preprocess(),
	kit: {
		package: {
			override: {
				svelte: 'index.js'
			}
		}
	}
};
