module.exports = {
	kit: {
		// TODO adapterless builds
		adapter: '@sveltejs/adapter-node',

		// this creates `window.start` which starts the app, instead of
		// it starting automatically — allows test runner to control
		// when hydration occurs
		startGlobal: 'start'
	},

	blah: 42
};
