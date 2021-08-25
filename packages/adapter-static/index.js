/**
 * @param {{
 *   pages?: string;
 *   assets?: string;
 *   fallback?: string;
 *   outputFileName?: (opts: {path: string, is_html: boolean}) => string;
 * }} [opts]
 */
export default function({ pages = 'build', assets = pages, fallback, outputFileName } = {}) {
	/** @type {import('@sveltejs/kit').Adapter} */
	return {
		name: '@sveltejs/adapter-static',

		/** @type {import('@sveltejs/kit').Adapter['adapt']} */
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
