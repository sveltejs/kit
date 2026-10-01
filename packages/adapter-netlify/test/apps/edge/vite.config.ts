import { sveltekit } from '@sveltejs/kit/vite';
import type { UserConfig } from 'vite';

const config: UserConfig = {
	build: {
		minify: false
	},
	plugins: [sveltekit()]
};

export default config;
