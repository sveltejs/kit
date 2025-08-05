import { Foo } from '../../lib';

export function load() {
	return { foo: new Foo('It works') };
}
