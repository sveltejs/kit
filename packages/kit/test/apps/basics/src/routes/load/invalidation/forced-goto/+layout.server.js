import { increment } from '../../state.js';

export const load = () => {
	return {
		a: increment(import.meta.url)
	};
};
