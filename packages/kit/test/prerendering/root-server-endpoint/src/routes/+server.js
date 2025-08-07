import { json } from '@sveltejs/kit';

export const prerender = true;

export function GET() {
	return json({ message: 'Root server endpoint returning JSON' });
}
