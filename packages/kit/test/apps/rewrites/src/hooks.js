import { browser } from '$app/environment';

const mapping = {
	'/basic/a': '/basic/b',
	'/client-only-redirect/a': '/client-only-redirect/b',
	'/preload-data/a': '/preload-data/b'
};

/** @type {import("@sveltejs/kit").RewriteUrl} */
export const rewriteUrl = ({ url }) => {
	//Try to rewrite external URLs to the homepage - This should not work
	if (browser && url.origin !== window.location.origin) {
		return new URL('/', new URL(window.location.href));
	}

	if (url.pathname === '/error-handling/client-error') {
		if (browser) {
			throw new Error('Client Error');
		} else {
			url.pathname = '/error-handling/client-error-rewritten';
		}
	}

	if (url.pathname === '/error-handling/server-error') {
		throw new Error('Server Error - Should trigger 500 response');
	}

	url.pathname = mapping[url.pathname] || url.pathname;

	if (url.pathname === '/external/rewritten') {
		return new URL('https://google.com');
	}

	return url;
};
