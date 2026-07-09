import { prerender } from '$app/server';
import { redirect } from '@sveltejs/kit';

export const layout_redirect = prerender('unchecked', (path) => {
	if (path !== '/remote/prerender/redirect/redirected') {
		redirect(307, '/remote/prerender/redirect/redirected');
	}

	return path;
});
