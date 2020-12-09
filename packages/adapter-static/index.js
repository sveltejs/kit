'use strict';

module.exports = async function adapter(builder, { pages = 'build', assets = 'build' } = {}) {
	// TODO implement adapter options, allow 'build' to be specified

	builder.copy_static_files(assets);
	builder.copy_client_files(assets);

	await builder.prerender({
		force: true,
		dest: pages
	});
};
