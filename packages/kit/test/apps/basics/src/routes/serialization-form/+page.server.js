import { Foo } from '../../lib';

/** @satisfies {import('./$types').Actions} */
export const actions = {
	default: async () => {
		return { foo: new Foo('It works') };
	}
};
