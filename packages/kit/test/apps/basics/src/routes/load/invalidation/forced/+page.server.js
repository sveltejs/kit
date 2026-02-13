import { increment } from '../../state.js';
export const load = () => {
	return {
		b: increment(import.meta.url)
	};
};
