import { form, query, requested } from '$app/server';

export const get_time = query(() => Date.now());

export const submit = form('unchecked', async () => {
	// must work on both enhanced and non-enhanced (no-JS) submissions —
	// in the latter case there are simply no requested refreshes
	await requested(get_time, 5).refreshAll();

	return { message: 'submitted successfully' };
});
