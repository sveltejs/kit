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

/**
 * @param {import('types').PageNodeIndexes} page
 * @param {import('@sveltejs/kit').SSRManifest} manifest
 */
export async function load_page_and_error_nodes(page, manifest) {
	// we use == here rather than === because [undefined] serializes as "[null]"
	const pending_layouts = page.layouts.map((n) => (n == undefined ? n : manifest._.nodes[n]()));
	const pending_errors = page.errors.map((n) => (n == undefined ? n : manifest._.nodes[n]()));
	const pending_leaf = manifest._.nodes[page.leaf]();

	const [layouts, errors, leaf] = await Promise.all([
		Promise.all(pending_layouts),
		Promise.all(pending_errors),
		pending_leaf
	]);

	return {
		layouts,
		errors,
		leaf
	};
}
