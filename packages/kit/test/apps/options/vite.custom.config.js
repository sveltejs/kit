import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vitest/config').ViteUserConfig} */
const config = {
	build: {
		minify: false,
		assetsInlineLimit: 0
	},
	clearScreen: false,
	plugins: [sveltekit()],
	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	},
	test: {
		include: ['./unit-test/*.spec.js']
	}
};

export default config;
