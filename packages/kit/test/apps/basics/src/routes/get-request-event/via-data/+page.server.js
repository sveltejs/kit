import { getRequestEvent } from '$app/server';

/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
	const event = getRequestEvent();
	// reassignment, not mutation: only visible in handleFetch if the store event is never a copy
	event.locals = { ...event.locals, message: 'hello from the server load' };
	const res = await fetch('/headers/echo');
	return { message: (await res.json())['x-message'] };
}
