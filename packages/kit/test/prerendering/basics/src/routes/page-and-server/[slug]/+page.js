export const prerender = true;

export function entries() {
	return [{ slug: '1' }];
}

export async function load({ fetch, params }) {
	const resp = await fetch(`/page-and-server/${params.slug}`);
	return await resp.json();
}
