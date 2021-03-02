import { resolve } from 'path';

export default {
	build: {
		minify: false
	},
	resolve: {
		alias: {
			$components: resolve('source/components')
		}
	},
	clearScreen: false
};
