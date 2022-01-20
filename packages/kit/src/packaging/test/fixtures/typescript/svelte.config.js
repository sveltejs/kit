import preprocess from 'svelte-preprocess';

export default {
	preprocess: preprocess(),

	kit: {
		package: {
			override: (pkg) => ({ ...pkg, svelte: 'index.js' })
		}
	}
};
