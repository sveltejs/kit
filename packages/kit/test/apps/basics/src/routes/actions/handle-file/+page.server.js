import { invalid } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	default: ({ files }) => {
		throw invalid(400, undefined, {
			result: files.get('file')
		});
	}
};
