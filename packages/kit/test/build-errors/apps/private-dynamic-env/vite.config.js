import { sveltekit } from '@sveltejs/kit/vite';
import path from 'node:path';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [sveltekit()],
	server: {
		fs: {
			allow: [path.resolve('../../../../src')]
		}
	}
};

export default config;
