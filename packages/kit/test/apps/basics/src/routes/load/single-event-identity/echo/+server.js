import { json } from '@sveltejs/kit';

export function GET({ request }) {
	return json({ written_in_handle: request.headers.get('x-written-in-handle') });
}
