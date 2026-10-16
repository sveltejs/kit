import { error, redirect } from '@sveltejs/kit';
import { getRequestEvent, query } from '$app/server';

export const guard = query(() => {
	if (!getRequestEvent().cookies.get('query-guard-authorized')) {
		error(401, 'Unauthorized');
	}
	return true;
});

export const go_home = query(() => {
	redirect(303, '/remote/query-guard');
});

export const batch_go_home = query.batch('unchecked', () => {
	redirect(303, '/remote/query-guard');
});
