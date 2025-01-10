import { browser } from '$app/environment';
import { Foo } from './lib';

const mapping = {
	'/reroute/basic/a': '/reroute/basic/b',
	'/reroute/client-only-redirect/a': '/reroute/client-only-redirect/b',
	'/reroute/preload-data/a': '/reroute/preload-data/b'
};

/** @type {import("@sveltejs/kit").Reroute} */
export const reroute = ({ url }) => {
	//Try to rewrite the external url used in /reroute/external to the homepage - This should not work
	if (browser && url.href.startsWith('https://expired.badssl.com')) {
		return '/';
	}

	if (url.pathname === '/reroute/error-handling/client-error') {
		if (browser) {
			throw new Error('Client Error');
		} else {
			return '/reroute/error-handling/client-error-rewritten';
		}
	}

	if (url.pathname === '/reroute/error-handling/server-error') {
		throw new Error('Server Error - Should trigger 500 response');
	}

	if (url.pathname in mapping) {
		return mapping[url.pathname];
	}
};

/** @type {import("@sveltejs/kit").Transport} */
export const transport = {
	Foo: {
		encode: (value) => value instanceof Foo && [value.message],
		decode: ([message]) => new Foo(message)
	}
};
