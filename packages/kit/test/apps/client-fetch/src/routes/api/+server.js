import { json } from '@sveltejs/kit';

export function GET({ request }) {
	const header = request.headers.get('x-client-header') ?? 'empty';

	return json({ header });
}
