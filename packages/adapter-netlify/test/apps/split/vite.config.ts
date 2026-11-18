import { sveltekit } from '@sveltejs/kit/vite';
import type { UserConfig } from 'vite';
import adapter from '@sveltejs/adapter-netlify';

const config: UserConfig = {
	build: {
		minify: false
	},
	plugins: [
		sveltekit({
			adapter: adapter(),
			compilerOptions: { experimental: { async: true } },
			experimental: {
				remoteFunctions: true
			}
		})
	]
};

export default config;
