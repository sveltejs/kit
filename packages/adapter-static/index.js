/** @type {import('.')} */
export default function({ pages = 'build', assets = pages, fallback, outputFileName } = {}) {
	return {
		name: '@sveltejs/adapter-static',

		async adapt({ utils }) {
			utils.rimraf(assets);
			utils.rimraf(pages);

			utils.copy_static_files(assets);
			utils.copy_client_files(assets);

			await utils.prerender({
				fallback,
				all: !fallback,
				dest: pages,
				output_file_name: outputFileName
			});
		}
	};
}
