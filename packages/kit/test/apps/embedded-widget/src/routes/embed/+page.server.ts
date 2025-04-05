import type { Actions, PageServerLoad, PageServerLoadEvent } from './$types';

export const embed = (event: PageServerLoadEvent) => {
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

export const load: PageServerLoad = ({ params }) => {
	return {
		counter: 10
	};
};
