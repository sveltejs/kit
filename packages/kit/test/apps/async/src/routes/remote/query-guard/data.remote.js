import { error, redirect } from '@sveltejs/kit';
import { query } from '$app/server';

export const guard = query(() => {
	error(401, 'Unauthorized');
});

export const go_home = query(() => {
	redirect(303, '/remote/query-guard');
});

export const batch_go_home = query.batch('unchecked', () => {
	redirect(303, '/remote/query-guard');
});
