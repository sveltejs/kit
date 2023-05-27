import { sveltekit } from '@sveltejs/kit/vite';
import * as path from 'path';
import { imagetools } from 'vite-imagetools';

const fallback = {
	'.heic': 'jpg',
	'.heif': 'jpg',
	'.avif': 'png',
	'.jpeg': 'jpg',
	'.jpg':  'jpg',
	'.png':  'png',
	'.tiff': 'jpg',
	'.webp': 'png',
	'.gif':  'gif'
};

/** @type {import('vite').UserConfig} */
const config = {
	assetsInclude: ['**/*.vtt'],

	logLevel: 'info',

	plugins: [
		imagetools({
			defaultDirectives: (url) => {
				const ext = path.extname(url.pathname);
				const params = new URLSearchParams();
				params.set('format', 'avif;webp;' + fallback[ext]);
				if (!params.has('meta') && !params.has('metadata') && !params.has('source') && !params.has('srcset') && !params.has('url')) {
					params.set('picture', true);
				}
				return params;
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
