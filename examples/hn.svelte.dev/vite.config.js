import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import svelte from 'vite-plugin-svelte';

const __dirname = dirname(fileURLToPath(import.meta.url));
const production = (process.env.NODE_ENV === 'production')

export default {
	alias: {
		'$app': resolve(__dirname, '.svelte/assets/runtime/app'),
		'$components': resolve(__dirname, 'src/components')
	},
	plugins: [
		svelte({
			emitCss: false,
			compilerOptions: {
				dev: !production,
				hydratable: true
			},
			hot: true
		})
	]
}
