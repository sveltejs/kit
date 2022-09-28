import { sveltekit } from '@sveltejs/kit/vite';
import * as path from 'path';
import { imagetools } from 'vite-imagetools';
import legacy from '@vitejs/plugin-legacy';

/** @type {import('vite').UserConfig} */
const config = {
	logLevel: 'info',

	plugins: [
		imagetools(),
		legacy({
			targets: ['ie >= 11'],
			additionalLegacyPolyfills: [
				'custom-event-polyfill',
				'core-js/modules/es.promise.js',
				'whatwg-fetch',
				// 'global-this' should be used so 'regenerator-runtime' wouldn't do CSP issues
				'core-js/proposals/global-this',
				'regenerator-runtime/runtime',
				'unorm',
				'path-composedpath-polyfill',
				'proxy-polyfill/proxy.min.js'
			]
		}),
		sveltekit(),
	],

	server: {
		fs: {
			strict: false
		}
	}
};

export default config;
