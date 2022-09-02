import { invalid } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	default: ({ files }) => {
		return invalid(400, {
			errors: { result: files.get('file') }
		});
	}
};
