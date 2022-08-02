import { error } from '@sveltejs/kit/data';
import { FancyError } from '../_shared.js';

export const POST = () => {
	throw error(400, new FancyError('oops'));
};
