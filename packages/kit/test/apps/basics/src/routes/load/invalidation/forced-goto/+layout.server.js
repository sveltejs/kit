import { increment } from './state';

export const load = () => {
	return {
		a: increment()
	};
};
