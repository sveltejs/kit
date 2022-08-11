import { read_headings } from '$lib/docs/server';

export const prerender = true;

/** @type {import('./$types').Get} */
export function GET() {
	return {
		sections: read_headings('docs')
	};
}
