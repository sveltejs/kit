import { fileURLToPath } from 'url';

export default {
	build: {
		minify: false
	},
	resolve: {
		alias: {
			$components: fileURLToPath(new URL('source/components', import.meta.url))
		}
	},
	clearScreen: false
};
