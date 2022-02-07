import { read } from '$lib/docs';

export function get() {
	return {
		body: read('docs')
	};
}
