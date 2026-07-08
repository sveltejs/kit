import * as path from 'node:path';
import process from 'node:process';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '../../../../adapter-auto/index.js';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},

	clearScreen: false,

	logLevel: 'silent',

	plugins: [
		sveltekit({
			adapter: adapter(),
			version: {
				name: process.env.SK_VERSION || Date.now().toString()
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
