const preprocess = require('svelte-preprocess');

module.exports = {
	preprocess: preprocess(),
	kit: {
		package: {
			override: (pkg) => ({ ...pkg, svelte: 'index.js' })
		}
	}
};
