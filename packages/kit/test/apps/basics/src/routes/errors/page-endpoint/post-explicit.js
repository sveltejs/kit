import { FancyError } from './_shared.js';

export const post = () => ({
	status: 400,
	body: new FancyError('oops')
});
