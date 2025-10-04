import { deserialize } from '$app/forms';

export async function GET({ fetch }) {
	const response = await fetch('/serialization-form-non-enhanced', {
		method: 'POST',
		body: new FormData(),
		headers: {
			'x-sveltekit-action': 'true'
		}
	});
	const result = deserialize(await response.text());

	if (result.type === 'success' && result.data) {
		return Response.json({
			data: /** @type {import('../../../lib').Foo} */ (result.data.foo).bar()
		});
	}

	return Response.json({});
}
