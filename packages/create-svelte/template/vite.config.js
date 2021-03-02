// Consult https://vitejs.dev/config/ to learn about these options
import { resolve } from 'path';

export default {
	resolve: {
		alias: {
			$components: resolve('src/components')
		}
	}
};
