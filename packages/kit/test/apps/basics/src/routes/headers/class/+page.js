/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const res = await fetch('/headers/echo', {
		headers: new Headers({ foo: 'bar' })
	});

	const { foo } = await res.json();
	return {
		foo
	};
}
