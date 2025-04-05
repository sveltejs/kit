import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return {
		about: "It's the best widget of all time."
	};
};
