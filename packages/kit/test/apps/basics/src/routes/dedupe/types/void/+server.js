import { sync_dedupe } from '../../dedupe.js';

export async function GET() {
	let a = sync_dedupe();
	if (a.length !== 1) {
		return new Response('Invalid response', { status: 500 });
	}
	const [count] = a;
	a = sync_dedupe();
	if (a.length !== 1) {
		return new Response('Invalid response', { status: 500 });
	}
	const [newCount] = a;
	if (newCount !== count) {
		return new Response('Invalid count', { status: 500 });
	}
	return new Response(null, { status: 204 });
}
