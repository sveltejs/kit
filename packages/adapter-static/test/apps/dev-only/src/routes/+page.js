export async function load({ fetch }) {
	const response = await fetch('/inherited.json');
	return await response.json();
}
