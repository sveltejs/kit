export const prerender = true;

export async function load({ fetch }) {
	const res = await fetch('/docs.json');

	return {
		sections: await res.json()
	};
}
