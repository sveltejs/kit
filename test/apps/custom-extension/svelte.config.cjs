module.exports = {
	kit: {
		adapter: '@sveltejs/adapter-node',
		extensions: ['.jesuslivesineveryone', '.whokilledthemuffinman', '.mdx', '.svelte'],
		// this creates `window.start` which starts the app, instead of
		// it starting automatically — allows test runner to control
		// when hydration occurs
		startGlobal: 'start'
	}
};
