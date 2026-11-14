import { building } from '$app/env';
import { command, query } from '$app/server';
import { Marker, state } from '../../lib/state.js';

// sveltekit only loads this in workerd during dev, and in node while it analyses a build
if (!building && navigator.userAgent !== 'Cloudflare-Workers') {
	throw new Error('remote modules should only run in workerd');
}

// the worker creates the marker before sveltekit handles any request
export const get_marker = query(() => state.marker instanceof Marker);

let count = 0;

export const increment = command(() => (count += 1));
