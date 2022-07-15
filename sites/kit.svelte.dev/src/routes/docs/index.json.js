import { read_headings } from '$lib/docs/server';

export function GET() {
	return {
		body: read_headings('docs')
	};
}
