import type { Actions, PageLoad } from './$types';

// export const ssr = false;

export const embed = (event) => {
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
			answer: data.get('answer'),
		};
	}
};

export const load: PageLoad = ({ params }) => {
	return {
		counter: 10
	};
};
