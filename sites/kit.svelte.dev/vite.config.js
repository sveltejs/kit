import { sveltekit } from '@sveltejs/kit/vite';
import * as path from 'path';
import { imagetools } from 'vite-imagetools';
import legacy from '@vitejs/plugin-legacy';
import packageConfig from './package.json';

const supportedExtensions = ['.png', '.jpg', '.jpeg'];

/** @type {import('vite').UserConfig} */
const config = {
	assetsInclude: ['**/*.vtt'],

	logLevel: 'info',

	plugins: [
		imagetools({
			defaultDirectives: (url) => {
				const extension = path.extname(url.pathname);
				if (supportedExtensions.includes(extension)) {
					return new URLSearchParams({
						format: 'avif;webp;' + extension.slice(1),
						picture: true
					});
				}
				return new URLSearchParams();
			}
		}),
		sveltekit(),
		legacy({
			targets: packageConfig.browserslist,
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
	],

	server: {
		fs: {
			strict: false
		}
	}
};

export default config;
