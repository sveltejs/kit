import { Foo } from '$lib';

/** @type {import("@sveltejs/kit").Transport} */
export const transport = {
	Foo: {
		encode: (value) => value instanceof Foo && [value.message],
		decode: ([message]) => new Foo(message)
	}
};
