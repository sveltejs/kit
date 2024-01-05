import preprocess from 'svelte-preprocess';

export default {
	compilerOptions: {
		enableSourcemap: false
	},
	preprocess: preprocess({
		preserve: ['ld+json']
	})
};
