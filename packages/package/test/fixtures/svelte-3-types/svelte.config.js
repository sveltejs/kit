import preprocess from 'svelte-preprocess';

export default {
	preprocess: preprocess({
		preserve: ['ld+json']
	})
};
