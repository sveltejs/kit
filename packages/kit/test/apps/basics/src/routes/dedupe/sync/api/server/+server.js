import { sync_dedupe } from '../../../dedupe.js';

export async function GET() {
	const a = sync_dedupe('foo', 'bar');
	return new Response(JSON.stringify(a), {
		headers: {
			'Content-Type': 'application/json'
		}
	});
}
