import { get_parsed_docs } from '$lib/server/docs/index.js';

export const prerender = true;

export async function load({ params }) {
	return { page: await get_parsed_docs(params.slug) };
}
