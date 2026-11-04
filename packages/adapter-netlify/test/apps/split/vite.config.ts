import { sveltekit } from '@sveltejs/kit/vite';
import type { UserConfig } from 'vite';
import adapter from '@sveltejs/adapter-netlify';

const config: UserConfig = {
	build: {
		minify: false
	},
	plugins: [
		sveltekit({
			adapter: adapter({ split: true, edge: process.env.EDGE === 'true' }),
			compilerOptions: { experimental: { async: true } },
			experimental: {
				remoteFunctions: true
			}
		})
	]
};

export default config;
