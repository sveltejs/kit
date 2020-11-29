module.exports = {
	adapter: '@sveltejs/adapter-node',

	paths: {
		static: 'public',
		routes: 'source/pages',
		template: 'source/template.html'
	},

	target: '#content-goes-here'
};
