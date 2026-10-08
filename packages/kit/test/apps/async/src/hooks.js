import { Foo } from '#lib';

/** @type {import("@sveltejs/kit/hooks").Transport} */
export const transport = {
	Foo: {
		encode: (value) => value instanceof Foo && [value.message],
		decode: ([message]) => new Foo(message)
	}
};

/** @type {import('@sveltejs/kit/hooks').Reroute} */
export const reroute = ({ url }) => {
	if (url.pathname === '/remote/match/origin') {
		return `/fork/${url.host}`;
	}
};
