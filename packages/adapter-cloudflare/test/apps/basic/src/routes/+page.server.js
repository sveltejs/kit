// this tests that Wrangler can correctly resolve and bundle server-side dependencies
import { sum } from 'server-side-dep';

export function load() {
	return {
		sum: sum(1, 2)
	};
}
