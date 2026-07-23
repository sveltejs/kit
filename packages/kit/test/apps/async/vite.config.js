import * as path from 'node:path';
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
			},
			typescript: {
				config(config) {
					config.include.push('../unit-test/*.js', '../test/*.js', '../playwright.config.js');
				}
			}
		})
	],
	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	},
	test: {
		include: ['unit-test/**/node.spec.js']
	}
});
