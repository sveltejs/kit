// @ts-ignore
import url from './message.csv';

export async function load({ fetch }) {
	const response = await fetch(url);
	const asset = await response.text();
	return { asset };
}
