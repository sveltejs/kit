/**
 * @param {{
 *   pages?: string;
 *   assets?: string;
 *   fallback?: string;
 * }} [opts]
 */
export default function ({ pages = 'build', assets = pages, fallback } = {}) {
	/** @type {import('@sveltejs/kit').Adapter} */
	const adapter = {
		name: '@sveltejs/adapter-static',

		async adapt({ utils }) {
			if (utils.update_ignores({ patterns: [pages, assets] })) {
				utils.log.minor('Ignore files updated');
			}
			utils.copy_static_files(assets);
			utils.copy_client_files(assets);

			await utils.prerender({
				fallback,
				all: !fallback,
				dest: pages
			});
		}
	};

	return adapter;
}
