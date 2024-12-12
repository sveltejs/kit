import { Foo } from '../../../lib';

export function load() {
	return { foo: new Foo('Client-side navigation also works') };
}
