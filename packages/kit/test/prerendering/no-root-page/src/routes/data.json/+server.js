import { redirect } from '@sveltejs/kit';

export const prerender = true;

export function GET() {
	// Redirect from a path with .json extension
	redirect(301, '/api.json');
}