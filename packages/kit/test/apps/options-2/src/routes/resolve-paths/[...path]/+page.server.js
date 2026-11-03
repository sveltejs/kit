import { resolve, asset } from '$app/paths';
import { redirect } from '@sveltejs/kit';

export const trailingSlash = 'never';

/** @param {import('./$types').PageServerLoadEvent} event */
export function load({ url }) {
	if (url.searchParams.has('redirect')) {
		redirect(303, resolve('/hello'));
	}

	return { link: resolve('/hello'), asset: asset('answer.txt') };
}
