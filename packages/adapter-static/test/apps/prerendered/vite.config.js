const { sveltekit } = await import(
	process.env.CI ? '@sveltejs/kit/vite' : '../../../../kit/src/vite/index.js'
);

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},
	plugins: [sveltekit()]
};

export default config;
