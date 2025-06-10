import { json } from '@sveltejs/kit';

export async function GET() {
	return json({ message: 'success', timestamp: Date.now() });
}
