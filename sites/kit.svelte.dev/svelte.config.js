import * as path from 'path';
import adapter from '@sveltejs/adapter-auto';
import { imagetools } from 'vite-imagetools';

const API_BASE = 'https://api.svelte.dev';

export default {
	kit: {
		adapter: adapter(),

		vite: {
			define: {
				'process.env.API_BASE': JSON.stringify(API_BASE)
			},

			plugins: [imagetools()],

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
		}
	}
};
