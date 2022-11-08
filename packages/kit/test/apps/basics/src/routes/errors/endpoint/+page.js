/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const res = await fetch('/errors/endpoint.json');
	if (res.ok) {
		return await res.json();
	} else {
		throw new Error(String(res.status));
	}
}
