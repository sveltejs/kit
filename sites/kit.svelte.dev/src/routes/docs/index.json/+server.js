import { read_headings } from '$lib/docs/server';

export function GET() {
	return read_headings('docs');
}
