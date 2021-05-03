import netlify from '@sveltejs/adapter-netlify';

module.exports = {
	kit: {
		adapter: netlify(),
		target: '#svelte'
	}
};
