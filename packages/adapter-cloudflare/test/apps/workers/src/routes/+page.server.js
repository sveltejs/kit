import { sum } from 'server-side-dep';

export function load() {
	return {
		sum: sum(1, 2)
	};
}
