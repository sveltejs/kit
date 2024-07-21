/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		serverOnlyPaths: [/\/private-boom\//]
	}
};

export default config;
