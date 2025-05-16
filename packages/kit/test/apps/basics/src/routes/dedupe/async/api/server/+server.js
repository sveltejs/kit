import { async_dedupe } from '../../../dedupe.js';

export async function GET() {
	const a = await async_dedupe('foo', 'bar');
	return new Response(JSON.stringify(a), {
		headers: {
			'Content-Type': 'application/json'
		}
	});
}
