import * as path from 'path';
import { plugin } from '../../utils.js';

/** @type {import('vite').Plugin} */
const hookPlugin = {
	name: 'test-hooks-api',
	/** @property {import('types').ViteKitPluginHookApi} */
	api: {
		onKitConfig() {
			console.log('onKitConfig called');
		},
		onKitPrerendered() {
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
	plugins: [plugin({ viteHooks: { pluginNames: [hookPlugin.name] } }), hookPlugin],
	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	}
};

export default config;
