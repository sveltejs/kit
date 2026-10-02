import { sum } from '../lib/shared';

export function load() {
	return {
		sum: sum(1, 2)
	};
}
