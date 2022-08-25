import path from 'path';
import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [sveltekit()],

	server: {
		fs: {
			allow: [path.resolve('../../../kit')]
		}
	}
};

export default config;
