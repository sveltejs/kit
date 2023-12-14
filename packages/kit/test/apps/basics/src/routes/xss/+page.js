/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const res = await fetch('/xss.json');
	if (!res.ok) throw new Error('Error fetching /xss.json');
	const user = await res.json();
	return { user };
}
