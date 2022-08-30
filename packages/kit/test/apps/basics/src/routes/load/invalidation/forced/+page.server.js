import { increment } from './state';

export const load = () => {
	return {
		b: increment()
	};
};
