import preprocess from 'svelte-preprocess';

export default {
	compilerOptions: {
		enableSourcemap: true
	},
	preprocess: preprocess({
		sourceMap: true
	})
};
