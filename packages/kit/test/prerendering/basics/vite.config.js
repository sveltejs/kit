import * as path from 'path';
import { plugin } from '../../utils.js';

/** @type {import('vite').Plugin} */
const hookPlugin = {
	name: 'test-hooks-api',
	/** @property {import('types').VitePluginApi} */
	api: {
		/** @param {import('types').ValidatedConfig} validatedConfig */
		onKitConfig(validatedConfig) {
			console.log('onKitConfig called');
		},
		/** @param {import('types').Prerendered} prerendered */
		onKitPrerendered(prerendered) {
			console.log('onKitPrerendered called');
		},
		onKitAdapter() {
			console.log('onKitAdapter called');
		}
	}
};

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},
	clearScreen: false,
	plugins: [plugin({ viteHooks: [hookPlugin.name] }), hookPlugin],
	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	}
};

export default config;
