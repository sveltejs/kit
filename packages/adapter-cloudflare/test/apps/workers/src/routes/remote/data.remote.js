import { building } from '$app/env';
import { command, query } from '$app/server';

// sveltekit only loads this in workerd during dev, and in node while it analyses a build
if (!building && navigator.userAgent !== 'Cloudflare-Workers') {
	throw new Error('remote modules should only run in workerd');
}

export const runtime = query(() => navigator.userAgent);

let count = 0;

export const increment = command(() => (count += 1));
