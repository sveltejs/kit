import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false,
		sourcemap: true
	},
	clearScreen: false,
	plugins: [
		sveltekit({
			output: {
				bundleStrategy: 'inline'
			},
			serviceWorker: {
				register: false
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
