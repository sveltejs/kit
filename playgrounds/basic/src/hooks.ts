import { getRequestEvent } from '$app/server';

export const transport = {
	Foo: {
		encode: () => [1],
		decode: ([n]) => n
	}
};
