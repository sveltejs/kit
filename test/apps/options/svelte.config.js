module.exports = {
	kit: {
		// TODO adapterless builds
		adapter: '@sveltejs/adapter-node',

		files: {
			assets: 'public',
			routes: 'source/pages',
			template: 'source/template.html'
		},

		// TODO change this post-https://github.com/snowpackjs/snowpack/pull/1862
		// to test a non-default appDir
		appDir: '_wheee',

		target: '#content-goes-here',

		// this creates `window.start` which starts the app, instead of
		// it starting automatically — allows test runner to control
		// when hydration occurs
		startGlobal: 'start'
	}
};
