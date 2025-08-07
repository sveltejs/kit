import { json } from '@sveltejs/kit';

export const prerender = true;

export function GET() {
	return json({ message: 'Root endpoint returning JSON' });
}