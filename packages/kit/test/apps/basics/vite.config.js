import { resolve } from 'path';

export default {
	build: {
		minify: false
	},
	resolve: {
		alias: {
			$components: resolve('src/components')
		}
	},
	clearScreen: false
};
