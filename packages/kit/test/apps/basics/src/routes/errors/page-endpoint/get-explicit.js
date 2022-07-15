import { FancyError } from './_shared.js';

export const GET = () => ({
	status: 400,
	body: new FancyError('oops')
});
