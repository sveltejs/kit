import path from 'path';
import svelte from 'vite-plugin-svelte';

const production = (process.env.NODE_ENV === 'production')

export default {
	alias: {
		'/$app': path.resolve(__dirname, '.svelte/assets/runtime/app'),
		'/_app': path.resolve(__dirname, '.svelte/assets/runtime/app'),
		'/$components': path.resolve(__dirname, 'src/components'),
		'/_components': path.resolve(__dirname, 'src/components')
	},
	plugins: [
		svelte({
			emitCss: false,
			compilerOptions: {
				dev: !production,
				hydratable: true
			}
		})
	]
}
