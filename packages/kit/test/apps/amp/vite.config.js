import * as path from 'path';
import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},
	clearScreen: false,
	plugins: [sveltekit()],
	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	},
	ssr: {
		// workaround https://github.com/vitejs/vite/pull/9296
		external: process.env.NODE_ENV === 'development' ? ['@sveltejs/kit'] : undefined
	}
};

export default config;
