import process from 'node:process';
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
			compilerOptions: {
				experimental: {
					async: true
				}
			},
			csp: {
				directives: {
					'require-trusted-types-for': ['script'],
					'trusted-types': ['svelte-trusted-html', 'sveltekit-trusted-url']
				}
			},
			paths: {
				base: '/basepath',
				relative: true
			},
			serviceWorker: {
				register: !!process.env.REGISTER_SERVICE_WORKER
			},
			env: {
				dir: '../../env'
			},
			output: {
				linkHeaderPreload: true,
				bundleStrategy: 'single'
			},
			experimental: {
				remoteFunctions: true
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
