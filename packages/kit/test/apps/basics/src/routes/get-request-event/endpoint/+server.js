import { getRequestEvent } from '$app/server';
import { text } from '@sveltejs/kit';

export function GET() {
	const event = getRequestEvent();

	console.log(event.locals);

	return text(event.locals.message);
}
