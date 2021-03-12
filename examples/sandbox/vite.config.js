// Consult https://vitejs.dev/config/ to learn about these options
import { join, resolve } from 'path';
import { readFileSync } from 'fs';
import { cwd } from 'process';

const pkg = JSON.parse(readFileSync(join(cwd(), 'package.json')));

/** @type {import('vite').UserConfig} */
export default {
	build: {
		minify: false
	},
	resolve: {
		alias: {
			$components: resolve('src/components')
		}
	},
	ssr: {
		noExternal: Object.keys(pkg.dependencies || {})
	}
};
