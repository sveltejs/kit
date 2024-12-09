import { Foo } from '$lib';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	return { foo: new Foo() };
};

export const serialize = {
	Foo: (value) => value instanceof Foo && {}
};
