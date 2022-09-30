import preprocess from 'svelte-preprocess';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.join(__filename, '..');

export default {
	preprocess: preprocess(),
	kit: {
		alias: {
			$utils: path.resolve(__dirname, './src/lib/utils')
		}
	}
};
