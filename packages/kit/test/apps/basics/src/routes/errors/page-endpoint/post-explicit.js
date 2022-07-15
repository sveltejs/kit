import { FancyError } from './_shared.js';

export const POST = () => ({
	status: 400,
	body: new FancyError('oops')
});
