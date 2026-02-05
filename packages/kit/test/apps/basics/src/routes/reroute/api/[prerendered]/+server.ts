import { text } from '@sveltejs/kit';

// This is inside a route with a route segment to ensure that the route is marked as prerendered
// as part of reroute resolution even when no `entries` is given.
export const prerender = true;

export function GET() {
	return text('/reroute/async/b');
}
