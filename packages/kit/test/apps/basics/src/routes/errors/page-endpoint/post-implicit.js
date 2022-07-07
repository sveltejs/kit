import { FancyError } from './_shared.js';

export const post = () => {
	throw new FancyError('oops');
};
