import { redirect } from '@sveltejs/kit';

export const prerender = true;

export function GET() {
	// Redirect from a JSON-like endpoint
	redirect(301, '/json');
}