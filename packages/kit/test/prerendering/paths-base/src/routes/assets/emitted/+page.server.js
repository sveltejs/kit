// @ts-ignore
import url from './message.csv?url';

export async function load({ fetch }) {
	const response = await fetch(url);
	const message = await response.text();
	return { message };
}
