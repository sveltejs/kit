// Consult https://vitejs.dev/config/ to learn about these options
import { resolve } from 'path';

/** @type {import('vite').UserConfig} */
export default {
	resolve: {
		alias: {
			$components: resolve('src/components')
		}
	}
};
