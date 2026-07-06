import adapter from '../../../../adapter-auto/index.js';
import process from 'node:process';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		version: {
			name: process.env.SK_VERSION || 'control'
		}
	}
};

export default config;
