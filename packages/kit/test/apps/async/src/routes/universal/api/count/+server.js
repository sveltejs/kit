import { json } from '@sveltejs/kit';
import { get_state } from '../state.js';

export function GET() {
	return json({ count: get_state().count });
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	const state = get_state();
	state.count = (await request.json()).count;
	return json({ count: state.count });
}
