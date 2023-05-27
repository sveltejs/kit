export async function load(event) {
	const url = '/load/fetch-cache-control/load-data';

	const res_fr = await event.fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ lang: 'fr' })
	});
	const fr = await res_fr.json();

	const res_hu = await event.fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ lang: 'hu' })
	});

	const hu = await res_hu.json();

	return { fr, hu };
}
