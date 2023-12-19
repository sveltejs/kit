/**
 * @type {import("@sveltejs/kit").RewriteURL}
 */
export const rewriteURL = ({ url }) => {
	if (url.pathname.startsWith('/rewrites/from')) {
		url.pathname = url.pathname.replace('/rewrites/from', '/rewrites/to');
		console.log('rewrites', url.pathname);
		return url;
	}

	if (url.pathname.startsWith('/chained/intermediate')) {
		url.pathname = '/chained/to';
		return url;
	}

	return url;
};

/**
 * @type {import("@sveltejs/kit").ResolveDestination}
 */
export const resolveDestination = ({ to }) => {
	if (to.pathname.startsWith('/resolveDestination') && to.pathname.endsWith('from')) {
		to.pathname = to.pathname.replace('from', 'to');
		return to;
	}

	if (to.pathname === '/chained/from') {
		to.pathname = '/chained/intermediate';
		return to;
	}

	//If it matches the pattern /once/<int> then redirect to /once/<int+1>
	if (to.pathname.startsWith('/once')) {
		const match = to.pathname.match(/\/once\/(\d+)/);
		if (match) {
			const num = parseInt(match[1]);
			to.pathname = `/once/${num + 1}`;
		}
		return to;
	}

	return to;
};
