export async function load(event) {
	const url = '/load/fetch-cache-control/headers-diff';

	const res_error = await event.fetch(url, {
		method: 'GET'
	});
	const error = await res_error.json();

	const res_authorized = await event.fetch(url, {
		method: 'GET',
		headers: {
			Authorization: 'Bearer 31415'
		}
	});

	const account = await res_authorized.json();

	return { error, account };
}
