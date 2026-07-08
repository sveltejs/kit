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

			experimental: {
				remoteFunctions: true,
				handleRenderingErrors: true,
				forkPreloads: true
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
