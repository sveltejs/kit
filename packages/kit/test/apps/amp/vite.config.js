import * as path from 'path';
import { plugin } from '../../utils.js';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [plugin()],
	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	}
};

export default config;
