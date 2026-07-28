import * as path from 'node:path';
import process from 'node:process';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
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
				forkPreloads: true
			}
		})
	],
	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		},
		hmr: {
			overlay: process.env.PLAYWRIGHT_TEST !== '1'
		}
	},
	test: {
		include: ['unit-test/**/node.spec.js']
	}
});
