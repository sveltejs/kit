import { SHOULD_EXPLODE } from '$app/env/private';

/** @type {import('@sveltejs/kit').HandleClientError} */
export function handleError({ error }) {
	console.log(SHOULD_EXPLODE, error);
}
