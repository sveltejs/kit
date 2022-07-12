import { plugin } from '../../utils.js';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},
	plugins: [plugin()]
};

export default config;
