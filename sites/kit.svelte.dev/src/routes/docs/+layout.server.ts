import { read_headings } from '$lib/docs/server';

export const prerender = true;

export function GET() {
	return {
		sections: read_headings('docs')
	};
}
