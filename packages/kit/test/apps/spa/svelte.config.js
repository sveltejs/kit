/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		ssr: {
			enabled: false,
			overridable: false
		},
		target: '#svelte'
	}
};

export default config;
