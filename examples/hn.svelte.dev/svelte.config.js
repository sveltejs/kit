import netlify from '@sveltejs/adapter-netlify';

export default {
	kit: {
		adapter: netlify(),
		target: '#svelte',
		serviceWorker: {
			register: false
		}
	}
};
