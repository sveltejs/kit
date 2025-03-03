import asset from './example.json?no-inline';

export async function load({ fetch }) {
	const res = await fetch(asset);
	const data = await res.json();
	return data;
}
