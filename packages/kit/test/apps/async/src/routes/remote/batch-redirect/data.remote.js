import { query } from '$app/server';
import { redirect } from '@sveltejs/kit';

export const batch_redirect = query.batch('unchecked', () => {
	// same-page hash redirect so the page component survives the `goto`
	// and the test can observe whether the batched promises settle
	redirect(307, '/remote/batch-redirect#redirected');
});
