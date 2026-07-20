import { query } from '$app/server';
import { redirect } from '@sveltejs/kit';

// Regression for https://github.com/sveltejs/kit/issues/14285: a server-issued
// redirect to a same-origin URL that is not a client route must still navigate,
// rather than being rejected by the stricter `goto` behaviour.
export const redirectOutsideApp = query(() => {
	// `/robots.txt` is a real static asset but not a SvelteKit route
	redirect(307, '/robots.txt');
});
