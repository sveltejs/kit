export default function ({ pages = 'build', assets = 'build' } = {}) {
	return {
		async adapt(builder) {
			builder.copy_static_files(assets);
			builder.copy_client_files(assets);

			await builder.prerender({
				force: true,
				dest: pages
			});
		}
	};
}
