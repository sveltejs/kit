import { sveltekit } from '@sveltejs/kit/vite';
import * as path from 'path';
import { imagetools } from 'vite-imagetools';

const supportedExtensions = ['png', 'jpg', 'jpeg'];

/** @type {import('vite').UserConfig} */
const config = {
	assetsInclude: ['**/*.vtt'],

	logLevel: 'info',

	plugins: [
		imagetools({
			defaultDirectives: (url) => {
				const extension = url.pathname.substring(url.pathname.lastIndexOf('.') + 1);
				if (supportedExtensions.includes(extension)) {
					return new URLSearchParams({
						format: 'avif;webp;' + extension,
						picture: true
					});
				}
				return new URLSearchParams();
			}
		}),
		sveltekit()
	],

	server: {
		fs: {
			strict: false
		}
	}
};

export default config;
