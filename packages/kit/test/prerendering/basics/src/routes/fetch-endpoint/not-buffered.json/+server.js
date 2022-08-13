import { json } from '@sveltejs/kit';

export async function GET() {
	return json({ answer: 42 });
}
