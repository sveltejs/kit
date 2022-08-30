import { increment } from './state.js';

export function load() {
	return {
		count: increment()
	};
}
