import { sveltekit } from '@sveltejs/kit/vite';
import * as path from 'path';
import { imagetools } from 'vite-imagetools';

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
		sveltekit()
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
