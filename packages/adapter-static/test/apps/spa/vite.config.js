const { sveltekit } = await import(process.env.SVELTEKIT_PLUGIN);

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},
	plugins: [sveltekit()]
};

export default config;
