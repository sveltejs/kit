import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vitest/config').ViteUserConfig} */
const config = {
	plugins: [
		sveltekit({
			router: {
				type: 'hash',
				resolution: 'server'
			}
		})
	],
	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	}
};

export default config;
