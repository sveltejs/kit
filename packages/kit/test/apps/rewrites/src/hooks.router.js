/**
 * @type {import("@sveltejs/kit").RewriteURL}
 */
export const rewriteURL = ({ url }) => {
	if (url.pathname.startsWith('/rewrites/from')) {
		url.pathname = url.pathname.replace('/rewrites/from', '/rewrites/to');
		console.log('rewrites', url.pathname);
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

	return to;
};
