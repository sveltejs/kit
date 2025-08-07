import { json } from '@sveltejs/kit';

export const prerender = true;

export function GET() {
	return json({ message: 'API endpoint with .json in path' });
}