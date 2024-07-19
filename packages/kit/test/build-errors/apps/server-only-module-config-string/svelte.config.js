import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		serverProtectedPaths: [__dirname + '/src/private-boom']
	}
};

export default config;
