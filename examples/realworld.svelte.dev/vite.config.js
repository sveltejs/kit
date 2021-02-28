import { resolve } from 'path';

export default {
	resolve: {
		alias: {
			$common: resolve('src/common'),
			$components: resolve('src/components')
		}
	}
};
