import * as path from 'path';
import { plugin } from '../../utils.js';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [plugin()],
	server: {
		// TODO: required to support ipv6, remove on vite 3
		// https://github.com/vitejs/vite/issues/7075
		host: 'localhost',
		fs: {
			allow: [path.resolve('../../../src')]
		},
		// TODO: remove on vite 3
		// https://github.com/vitejs/vite/pull/8778
		watch: {
			// perf, do not watch playwright output dir
			ignored: ['**/test-results/**']
		}
	}
};

export default config;
