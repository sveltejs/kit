import { reset_states } from '../../../state.js';
import { json } from '@sveltejs/kit';

export const POST = () => {
	return json(reset_states(import.meta.url));
};
