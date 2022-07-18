import * as path from 'path';
import { plugin } from '../../utils.js';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},
	clearScreen: false,
	plugins: [plugin()],
	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		},
		hmr: false
	}
};

export default config;
