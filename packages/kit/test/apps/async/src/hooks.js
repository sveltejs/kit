import { Foo } from '#lib';

/** @type {import("@sveltejs/kit/hooks").Transport} */
export const transport = {
	Foo: {
		encode: (value) => value instanceof Foo && [value.message],
		decode: ([message], { call }) => new Foo(message, call)
	}
};
