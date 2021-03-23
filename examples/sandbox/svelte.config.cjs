const node = require('@sveltejs/adapter-node');
const pkg = require('./package.json');

module.exports = {
	kit: {
		adapter: node(),
		target: '#svelte',
		vite: {
			build: {
				minify: false
			},
			ssr: {
				noExternal: Object.keys(pkg.dependencies || {})
			}
		}
	}
};
