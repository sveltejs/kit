import { FancyError } from '../_shared.js';

export const load = () => {
	throw new FancyError('oops');
};
