import { deserialize } from '$app/forms';

export const ssr = false;

export function load() {
	const result = deserialize(
		JSON.stringify({
			type: 'success',
			status: 200,
			data: '[{"text":1},"Hello world!"]'
		})
	);

	return result;
}
