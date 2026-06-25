// TODO remove this once svelte-check reads config from vite
export default {
	compilerOptions: {
		experimental: {
			async: true
		}
	},
	kit: {
		outDir: '.custom-out-dir'
	}
};
