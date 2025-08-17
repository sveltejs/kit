import { building, dev } from '$app/environment';
import { prerender } from '$app/server';

export const prerendered = prerender(() => {
	if (!building && !dev) {
		throw new Error('this prerender should not be called at runtime in production');
	}

	return 'yes';
});

export const prerendered_entries = prerender(
	'unchecked',
	(x) => {
		// a,b directly through entries below, c indirectly through prerendering a page
		if (!building && !dev && ['a', 'b', 'c', '中文'].includes(x)) {
			throw new Error(
				'prerender should not be called at runtime in production with parameter ' + x
			);
		}

		return x;
	},
	{ inputs: () => ['a', 'b', /* to test correct encoding */ '中文'], dynamic: true }
);
