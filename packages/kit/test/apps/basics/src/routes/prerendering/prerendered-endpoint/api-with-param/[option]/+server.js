import { building, dev } from '$app/environment';
import { error, json } from '@sveltejs/kit';

export const prerender = 'auto';

/** @type {import('./$types').EntryGenerator} */
export function entries() {
	return [
		{
			option: 'prerendered'
		}
	];
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ params: { option } }) {
	if ((await entries()).find((entry) => entry.option === option)) {
		if (dev || building) {
			return json({ message: 'Im prerendered and called from a non-prerendered +page.server.js' });
		} else {
			error(500, 'I should not be called at runtime because I am prerendered');
		}
	}
	return json({ message: 'Im not prerendered' });
}
