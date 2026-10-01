import { Foo } from '$lib';

export const load = () => {
	return {
		foo: Promise.resolve(new Foo('It works'))
	};
};
