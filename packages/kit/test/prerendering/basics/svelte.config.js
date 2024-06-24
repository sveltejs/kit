import adapter from '../../../../adapter-static/index.js';
import { writeFileSync } from 'node:fs';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),

		prerender: {
			handleHttpError: 'warn',
			origin: 'http://prerender.origin',
			handleMissingId: ({ id }) => {
				writeFileSync('./missing_ids/index.jsonl', JSON.stringify(id) + ',', 'utf-8');
			}
		}
	}
};

export default config;
