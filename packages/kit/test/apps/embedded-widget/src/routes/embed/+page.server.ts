import type { Actions, Embed, PageServerLoad } from './$types';

export const embed: Embed = (event) => {
	const target = event.url.searchParams.get('target');
	if (target) {
		return {
			target
		};
	}

	return null;
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();

		return {
			success: true,
			answer: data.get('answer')
		};
	}
};

export const load: PageServerLoad = (event) => {
	return {
		counter: 10
	};
};
