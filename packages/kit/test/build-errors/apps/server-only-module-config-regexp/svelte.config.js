import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		serverOnlyPaths: [/\/private-boom\//]
	}
};

export default config;
