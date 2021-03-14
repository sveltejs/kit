module.exports = {
	kit: {
		// TODO adapterless builds
		adapter: '@sveltejs/adapter-node',

		files: {
			assets: 'public',
			lib: 'source/components',
			routes: 'source/pages',
			template: 'source/template.html'
		},

		appDir: '_wheee',

		target: '#content-goes-here',

		host: 'example.com',

		// this creates `window.start` which starts the app, instead of
		// it starting automatically — allows test runner to control
		// when hydration occurs
		startGlobal: 'start'
	}
};
