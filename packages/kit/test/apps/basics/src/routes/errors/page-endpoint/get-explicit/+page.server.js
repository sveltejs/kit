import { error } from '@sveltejs/kit/data';
import { FancyError } from '../_shared.js';

export const GET = () => {
	throw error(400, new FancyError('oops'));
};
