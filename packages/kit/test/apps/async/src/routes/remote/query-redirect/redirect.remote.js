import { query } from '$app/server';
import { redirect } from '@sveltejs/kit';

export const layoutRedirect = query('unchecked', (path) => {
	if (path !== '/remote/query-redirect/from-common-layout/redirected') {
		redirect(307, '/remote/query-redirect/from-common-layout/redirected');
	}

	return path;
});

export const pageRedirect = query(() => {
	redirect(307, '/remote/query-redirect/redirected');
});
