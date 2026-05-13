import { redirect } from '@sveltejs/kit';

export const gate = true;

/** @type {import('./$types').LayoutServerLoad} */
export async function load({ url }) {
	if (!url.searchParams.has('authed')) {
		redirect(303, '/load/gate/redirect?authed=1');
	}
	return {};
}
