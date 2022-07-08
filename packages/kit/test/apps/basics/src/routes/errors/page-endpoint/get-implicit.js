import { FancyError } from './_shared.js';

export const get = () => {
	throw new FancyError('oops');
};
