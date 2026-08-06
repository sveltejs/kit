import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import adapter from '../../../index.js';

const compile =
	process.env.ADVANCED_COMPILE === 'true'
		? {
				compile: {
					outfile: 'build/advanced-app',
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
		: process.env.COMPILE === 'true';

export default defineConfig({
	build: {
		minify: false
	},
	plugins: [
		sveltekit({
			adapter: adapter({
				envPrefix: 'MY_CUSTOM_',
				compile
			})
		})
	]
});
