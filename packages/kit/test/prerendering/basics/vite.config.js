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
			paths: {
				origin: 'http://prerender.origin'
			},
			router: {
				resolution: 'server'
			},
			prerender: {
				handleHttpError: 'warn',
				handleMissingId: ({ id, message }) => {
					writeFileSync(
						'./missing_ids/index.jsonl',
						JSON.stringify({ id, message }) + ',',
						'utf-8'
					);
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
		name: 'kit-prerendering-basics',
		globalSetup: path.join(import.meta.dirname, 'globalSetup.js'),
		setupFiles: [path.join(import.meta.dirname, '../../matchers.js')]
	}
};

export default config;
