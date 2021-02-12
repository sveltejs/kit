'use strict';

export default async function adapter(builder, { pages = 'build', assets = 'build' } = {}) {
	builder.copy_static_files(assets);
	builder.copy_client_files(assets);

	await builder.prerender({
		force: true,
		dest: pages
	});
}
