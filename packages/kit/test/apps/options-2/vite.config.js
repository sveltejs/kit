import * as path from 'path';
import { sveltekit } from '@sveltejs/kit/experimental/vite';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [sveltekit()],
	server: {
		// TODO: required to support ipv6, remove on vite 3
		// https://github.com/vitejs/vite/issues/7075
		host: 'localhost',
		fs: {
			allow: [path.resolve('../../../src')]
		}
	}
};

export default config;
