/** @type {import('.')} */
export default function ({ pages = 'build', assets = pages, fallback } = {}) {
	return {
		name: '@sveltejs/adapter-static',

		async adapt(builder) {
			builder.rimraf(assets);
			builder.rimraf(pages);

			builder.writeStatic(assets);
			builder.writeClient(assets);

			await builder.prerender({
				fallback,
				all: !fallback,
				dest: pages
			});
		}
	};
}
