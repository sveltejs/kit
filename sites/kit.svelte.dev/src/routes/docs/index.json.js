import { read_headings } from '$lib/docs/server';

export function get() {
	return {
		body: read_headings('docs')
	};
}
