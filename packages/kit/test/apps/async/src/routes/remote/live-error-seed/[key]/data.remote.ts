import { query } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';

const seen = new Set<string>();

export const live_fail = query.live(v.string(), async function* (key) {
	if (!seen.has(key)) {
		// first connection (the SSR render) fails...
		seen.add(key);
		error(418, 'live teapot');
	}

	// ...subsequent connections block forever, so the only way the client
	// can show the error is by consuming the seeded SSR error record
	yield await new Promise<string>(() => {});
});
