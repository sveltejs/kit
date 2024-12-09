import { Foo } from '$lib';
import type { PageLoad } from './$types';

export const deserialize = {
	Foo: () => new Foo()
};
