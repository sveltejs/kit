import { format, parse } from 'path';
import adapter from '../../../index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: '200.html',
			outputFileName: ({ path, is_html }) => {
				if (!is_html) return path;

				let { root, dir, name, ext } = parse(path);

				if (!ext) ext = '.html';

				return format({ root, dir, name, ext });
			}
		}),
		target: '#svelte'
	}
};

export default config;
