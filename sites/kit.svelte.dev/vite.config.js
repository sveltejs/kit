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
				'regenerator-runtime/runtime'
			]
		}),
		sveltekit(),
	],

	resolve: {
		alias: {
			$img: path.resolve('src/images')
		}
	},

	server: {
		fs: {
			strict: false
		}
	}
};

export default config;
