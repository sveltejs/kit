import { query } from '$app/server';
import { env } from '$env/dynamic/private';
import { env as public_env } from '$env/dynamic/public';

if (!env.PRIVATE_DYNAMIC || !public_env.PUBLIC_DYNAMIC) {
	// This checks that dynamic env vars are available when prerendering remote functions
	// https://github.com/sveltejs/kit/pull/14219
	// and are not in the same chunk as this one
	// https://github.com/sveltejs/kit/issues/14439
	throw new Error('Dynamic environment variables are not set up correctly');
}

// placeholder query that needs to be imported/used elsewhere so that bundling/chunking would include env setup if not setup correctly
export const q = query(() => {});
