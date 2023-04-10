import { sveltekit } from '@sveltejs/kit/vite';
import * as path from 'node:path';
import { imagetools } from 'vite-imagetools';
import legacy from '@vitejs/plugin-legacy';

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
			additionalLegacyPolyfills: [
				'custom-event-polyfill',
				'core-js/modules/es.promise.js',
				'whatwg-fetch',
				'core-js/proposals/global-this',// so that 'regenerator-runtime' wouldn't do CSP issues
				'regenerator-runtime/runtime',
				'unorm',
				'path-composedpath-polyfill',
				'proxy-polyfill/proxy.min.js'
			]
		}),
	],

	ssr: {
		noExternal: ['@sveltejs/site-kit']
	},
	optimizeDeps: {
		exclude: ['@sveltejs/site-kit']
	},

	server: {
		fs: {
			strict: false
		}
	}
};

export default config;
