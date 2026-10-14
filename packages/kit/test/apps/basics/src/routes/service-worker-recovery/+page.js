import { browser } from '$app/env';
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export function load({ url }) {
	if (browser && location.pathname !== '/service-worker-recovery') {
		if (url.searchParams.has('expected')) {
			error(503, 'Simulated navigation error');
		}

		throw new Error('Simulated route load failure');
	}

	return {};
}
