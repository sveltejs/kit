import { sveltekit } from '@sveltejs/kit/vite';
import { readFileSync } from 'fs';
import * as path from 'path';
import { imagetools } from 'vite-imagetools';
import legacy from '@vitejs/plugin-legacy';

// The recommended way to list the legacy browsers is by putting this on a file named '.browserslistrc'.
// Sadly, babel preset plugin (the one that is being used by vite legacy plugin) doesn't read this file automatically,
// and from the other hand, postcssPresetEnv can't read the value passed to vite legacy plugin.
// This is why we don't specify the browser list explicitly in this vite config, but rather added this utility function
//  to read the browser list from the file.
const readBrowsersList = () => readFileSync("./.browserslistrc", { encoding: 'utf-8' })
	.split(/\r?\n/) // Split it to lines
	.map((line) => {
		const trimmedLine = line.trim();
		return (trimmedLine.length === 0 || trimmedLine[0] === "#") ? undefined : trimmedLine;
	})
	.filter((query) => query !== undefined)
	.join(', ');

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
						format: 'avif;webp;' + extension,
						picture: true
					});
				}
				return new URLSearchParams();
			}
		}),
		sveltekit(),
		legacy({
			targets: readBrowsersList(),
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
