import { FancyError } from './_shared.js';

export const get = () => ({
	status: 400,
	body: new FancyError('oops')
});
