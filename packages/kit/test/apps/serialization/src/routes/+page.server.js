import { Foo } from '$lib';

export function load() {
	return { foo: new Foo() };
}

export const serialize = {
	Foo: (value) => value instanceof Foo && {}
};
