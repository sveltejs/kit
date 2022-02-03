import * as path from 'path';
import adapter from '@sveltejs/adapter-auto';
import { imagetools } from 'vite-imagetools';

export default {
	kit: {
		adapter: adapter(),

		vite: {
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
