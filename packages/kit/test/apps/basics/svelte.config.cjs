module.exports = {
	kit: {
		adapter: '@sveltejs/adapter-node',
		hostHeader: 'x-forwarded-host',
		vite: {
			build: {
				minify: false
			},
			clearScreen: false
		}
	}
};
