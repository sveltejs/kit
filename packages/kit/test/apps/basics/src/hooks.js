import { browser } from '$app/environment';

const mapping = {
	'/reroute/basic/a': '/reroute/basic/b',
	'/reroute/client-only-redirect/a': '/reroute/client-only-redirect/b',
	'/reroute/preload-data/a': '/reroute/preload-data/b'
};

/** @type {import("@sveltejs/kit").Reroute} */
export const reroute = ({ url }) => {
	//Try to rewrite the external url used in /reroute/external to the homepage - This should not work
	if (browser && url.href.startsWith('https://expired.badssl.com')) {
		return new URL('/', new URL(window.location.href));
	}

	if (url.pathname === '/reroute/error-handling/client-error') {
		if (browser) {
			throw new Error('Client Error');
		} else {
			url.pathname = '/reroute/error-handling/client-error-rewritten';
		}
	}

	if (url.pathname === '/reroute/error-handling/server-error') {
		throw new Error('Server Error - Should trigger 500 response');
	}

	url.pathname = mapping[url.pathname] || url.pathname;

	if (url.pathname === '/reroute/external/rewritten') {
		return new URL('https://google.com');
	}

	return url;
};
