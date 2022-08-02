import { error } from '@sveltejs/kit';
import { FancyError } from '../_shared.js';

export const POST = () => {
	throw error(400, new FancyError('oops'));
};
