/** @type {import('@sveltejs/kit').Config} */
module.exports = {
	kit: {
		adapter: require('../../../index.cjs')({
			fallback: '200.html'
		}),
		target: '#svelte'
	}
};
