import { building, dev } from '$app/environment';
import { prerender } from '$app/server';

export const prerendered = prerender(() => {
	if (!building && !dev) {
		throw new Error('this prerender should not be called at runtime in production');
	}

	return 'yes';
});

export const prerendered_entries = prerender(
	(x) => {
		// a,b directly through entries below, c indirectly through prerendering a page
		if (!building && !dev && ['a', 'b', 'c'].includes(x)) {
			throw new Error(
				'prerender should not be called at runtime in production with parameter ' + x
			);
		}

		return x;
	},
	{ entries: () => [['a'], ['b']], dynamic: true }
);
