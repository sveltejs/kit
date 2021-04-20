module.exports = {
	kit: {
		appDir: '_wheee',
		files: {
			assets: 'public',
			lib: 'source/components',
			routes: 'source/pages',
			template: 'source/template.html'
		},
		host: 'example.com',
		paths: {
			base: '/foo/bar',
			assets: '/baz/qux'
		},
		target: '#content-goes-here',
		vite: {
			build: {
				minify: false
			},
			clearScreen: false
		}
	}
};
