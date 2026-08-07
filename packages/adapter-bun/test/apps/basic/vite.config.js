import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import adapter from '../../../index.js';

const buildOptions =
	process.env.ADVANCED_COMPILE === 'true'
		? {
				compile: {
					outfile: 'advanced-app',
					...(process.env.COMPILE_TARGET
						? {
								target: /** @type {import('bun').Build.CompileTarget} */ (
									process.env.COMPILE_TARGET
								)
							}
						: {})
				},
				minify: true,
				bytecode: true,
				sourcemap: 'linked'
			}
		: process.env.COMPILE === 'true'
			? { compile: true }
			: {};

export default defineConfig({
	build: {
		minify: false
	},
	plugins: [
		sveltekit({
			adapter: adapter({
				envPrefix: 'MY_CUSTOM_',
				buildOptions
			})
		})
	]
});
