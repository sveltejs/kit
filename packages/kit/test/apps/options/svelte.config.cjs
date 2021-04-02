module.exports = {
	kit: {
		files: {
			assets: 'public',
			lib: 'source/components',
			routes: 'source/pages',
			template: 'source/template.html'
		},
		appDir: '_wheee',
		target: '#content-goes-here',
		host: 'example.com',
		vite: {
			build: {
				minify: false
			},
			clearScreen: false
		}
	}
};
