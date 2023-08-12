import { get_docs_data, get_docs_list } from '$lib/server/docs/index.js';

export const prerender = true;

export async function load() {
	return {
		sections: get_docs_list(await get_docs_data())
	};
}
