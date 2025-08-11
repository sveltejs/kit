import { getRequestEvent } from '$app/server';
import { text } from '@sveltejs/kit';

export function GET() {
	const event = getRequestEvent();

	return text(event.locals.message);
}
