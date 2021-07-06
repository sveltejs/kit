import netlify from '@sveltejs/adapter-netlify';

export default {
	kit: {
		adapter: netlify(),
		target: '#svelte',
		vite: {
			server: {
				fs: {
					strict: true
				}
			}
		}
	}
};
