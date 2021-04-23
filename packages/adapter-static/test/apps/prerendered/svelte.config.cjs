/** @type {import('@sveltejs/kit').Config} */
module.exports = {
	kit: {
		adapter: require('../../../index.cjs')(),
		target: '#svelte'
	}
};
