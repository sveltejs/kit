import { writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '../../../../adapter-static/index.js';

/** @type {import('vitest/config').ViteUserConfig} */
const config = {
	build: {
		minify: false
	},

	clearScreen: false,

	logLevel: 'silent',

	plugins: [
		sveltekit({
			adapter: adapter(),
			prerender: {
				handleHttpError: 'warn',
				origin: 'http://prerender.origin',
				handleMissingId: ({ id }) => {
					writeFileSync('./missing_ids/index.jsonl', JSON.stringify(id) + ',', 'utf-8');
				}
			}
		})
	],

	define: {
		'process.env.MY_ENV': '"MY_ENV DEFINED"'
	},

	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	},

	test: {
		globalSetup: path.join(import.meta.dirname, 'globalSetup.js')
	}
};

export default config;
