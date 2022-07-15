import * as path from 'path';
import { plugin } from '../../utils.js';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},
	clearScreen: false,
	optimizeDeps: {
		// for CI, we need to explicitly prebundle deps, since
		// the reload confuses Playwright
		include: ['cookie', 'marked']
	},
	plugins: [plugin()],
	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		},
		hmr: false
	}
};

export default config;
