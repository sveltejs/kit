import { Foo } from '$lib';

export const serialize = {
	Foo: (value) => value instanceof Foo && {}
};
