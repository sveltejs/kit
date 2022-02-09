import { read_all } from '$lib/docs';

export function get() {
	return {
		body: read_all('docs').map(({ slug, title, sections }) => ({ slug, title, sections }))
	};
}
