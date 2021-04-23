module.exports = function ({ pages = 'build', assets = 'build' } = {}) {
	/** @type {import('@sveltejs/kit').Adapter} */
	const adapter = {
		name: '@sveltejs/adapter-static',

		async adapt(utils) {
			utils.copy_static_files(assets);
			utils.copy_client_files(assets);

			await utils.prerender({
				force: true,
				dest: pages
			});
		}
	};

	return adapter;
};
