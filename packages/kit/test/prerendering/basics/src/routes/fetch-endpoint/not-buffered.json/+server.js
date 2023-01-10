import { json } from '@sveltejs/kit';

let called = false;

export async function GET() {
	if (called) throw new Error('should only be called once');
	called = true;

	return json({ answer: 42 });
}
