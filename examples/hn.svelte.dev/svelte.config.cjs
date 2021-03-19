const netlify = require('@sveltejs/adapter-netlify');

module.exports = {
	kit: {
		adapter: netlify(),
		target: '#svelte'
	}
};
