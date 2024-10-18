/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		serverOnlyPaths: [() => undefined, (filename) => filename.includes('/private-boom/')]
	}
};

export default config;
