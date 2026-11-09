// this tests that server-side dependencies are resolved and included in the Worker
import { sum } from 'server-side-dep';

export function load() {
	return {
		sum: sum(1, 2)
	};
}
