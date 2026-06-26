// @ts-ignore
import url from './message.csv?url';

/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
	const response = await fetch(url);
	const message = await response.text();
	return { message };
}
