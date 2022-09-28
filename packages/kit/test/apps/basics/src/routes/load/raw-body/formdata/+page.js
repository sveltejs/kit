/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const formData = new FormData();
	formData.append('data', '{ "oddly" : { "formatted" : "json" } }');

	const res = await fetch('/load/raw-body.json', {
		method: 'POST',
		body: formData
	});

	return await res.json();
}
