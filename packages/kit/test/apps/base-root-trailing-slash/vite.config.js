import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},
	clearScreen: false,
	plugins: [
		sveltekit({
			adapter: {
				name: 'test',
				adapt() {}
			},
			paths: {
				base: '/basepath'
			}
		})
	],
	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	}
};

export default config;
