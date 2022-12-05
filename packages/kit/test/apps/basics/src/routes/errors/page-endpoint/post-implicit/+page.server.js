import { FancyError } from '../_shared.js';

/** @type {import('./$types').Actions} */
export const actions = {
	default: () => {
		throw new FancyError('oops');
	}
};
