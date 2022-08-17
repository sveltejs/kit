import { read_headings } from '$lib/docs/server';

export const prerender = true;

/** @type {import('./$types').LayoutServerLoad} */
export function load() {
	return {
		sections: read_headings('docs')
	};
}
