import { read_headings } from '$lib/docs';

export function get() {
	return {
		body: read_headings('docs').map(({ slug, title, sections }) => ({ slug, title, sections }))
	};
}
