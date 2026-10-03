import { error, json } from '@sveltejs/kit';
import { get_state } from '../state.js';

export function GET() {
	return json(get_state().todos);
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	const { text } = await request.json();

	if (text.includes('reject')) {
		error(400, 'rejected by the API');
	}

	get_state().todos.push(text);
	return json(text, { status: 201 });
}
