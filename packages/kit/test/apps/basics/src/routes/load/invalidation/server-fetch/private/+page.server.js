/** @type {import('./$types').PageServerLoad} */

import { PRIVATE_STATIC } from '$env/static/private';

export async function load({ fetch }) {
	return {
		time: fetch(`http://worldtimeapi.org/api/ip?PRIVATE=${encodeURIComponent(PRIVATE_STATIC)}`, {
			svelte: { depends: 'app:hidden-time-api' }
		}).then((res) => res.json())
	};
}
