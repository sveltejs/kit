/**
 * @param {import('types').PageNodeIndexes} page
 * @param {import('@sveltejs/kit').SSRManifest} manifest
 */
export function load_page_nodes(page, manifest) {
	return Promise.all([
		// we use == here rather than === because [undefined] serializes as "[null]"
		...page.layouts.map((n) => (n == undefined ? n : manifest._.nodes[n]())),
		manifest._.nodes[page.leaf]()
	]);
}
