import { deserialize } from '$app/forms';

export async function GET({ fetch }) {
	const response = await fetch('/deserialize', {
		method: 'POST',
		body: new FormData(),
		headers: {
			'x-sveltekit-action': 'true'
		}
	});
	const result = deserialize(await response.text());
	return Response.json(result);
}
