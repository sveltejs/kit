import { query, getRequestEvent } from '$app/server';

export const blocked_operations = query(() => {
	const { cookies, setHeaders } = getRequestEvent();

	/** @type {string[]} */
	const results = [];

	try {
		cookies.set('illegal', 'yes', { path: '/' });
		results.push('cookies.set succeeded');
	} catch (e) {
		results.push(/** @type {Error} */ (e).message);
	}

	try {
		setHeaders({ 'x-illegal': 'yes' });
		results.push('setHeaders succeeded');
	} catch (e) {
		results.push(/** @type {Error} */ (e).message);
	}

	return results.join(' | ');
});
