/** @type {import('.')} */
export default function ({ pages = 'build', assets = pages, fallback } = {}) {
	return {
		name: '@sveltejs/adapter-static',

		async adapt({ utils }) {
			utils.rimraf(assets);
			utils.rimraf(pages);

			utils.writeStatic(assets);
			utils.writeClient(assets);

			await utils.prerender({
				fallback,
				all: !fallback,
				dest: pages
			});
		}
	};
}
