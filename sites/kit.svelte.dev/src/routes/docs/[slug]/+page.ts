// TODO should use a shadow endpoint instead, need to fix a bug first
/** @type {import('./$types').Load} */
export async function load({ fetch, params }) {
	const res = await fetch(`/docs/${params.slug}.json`);
	const { prev, next, section } = await res.json();

	return {
		prev,
		next,
		section
	};
}
