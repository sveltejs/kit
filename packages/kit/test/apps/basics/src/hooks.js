import { browser } from '$app/environment';

const mapping = {
	'/rewrites/basic/a': '/rewrites/basic/b',
	'/rewrites/client-only-redirect/a': '/rewrites/client-only-redirect/b',
	'/rewrites/preload-data/a': '/rewrites/preload-data/b'
};

/** @type {import("@sveltejs/kit").RewriteUrl} */
export const rewriteUrl = ({ url }) => {
	//Try to rewrite the external url used in /rewrites/external to the homepage - This should not work
	if (browser && url.href.startsWith('https://expired.badssl.com')) {
		return new URL('/', new URL(window.location.href));
	}

	if (url.pathname === '/rewrites/error-handling/client-error') {
		if (browser) {
			throw new Error('Client Error');
		} else {
			url.pathname = '/rewrites/error-handling/client-error-rewritten';
		}
	}

	if (url.pathname === '/rewrites/error-handling/server-error') {
		throw new Error('Server Error - Should trigger 500 response');
	}

	url.pathname = mapping[url.pathname] || url.pathname;

	if (url.pathname === '/rewrites/external/rewritten') {
		return new URL('https://google.com');
	}

	return url;
};
