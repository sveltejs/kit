import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export function load({ cookies }) {
	const enhance_counter = +(cookies.get('enhance-counter') ?? 0);

	return {
		initial: 'initial',
		enhance_counter
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	login: async ({ request }) => {
		const fields = await request.formData();
		return {
			result: fields.get('username')
		};
	},
	register: async ({ request }) => {
		const fields = await request.formData();
		return {
			result: 'register: ' + fields.get('username')
		};
	},
	slow: async () => {
		await new Promise((resolve) => setTimeout(resolve, 500));
	},
	submitter: async ({ request }) => {
		const fields = await request.formData();
		return {
			result: 'submitter: ' + fields.get('submitter')
		};
	},
	error: () => {
		error(400, 'error');
	},
	echo: async ({ request }) => {
		const data = await request.formData();

		return {
			message: data.get('message')
		};
	},
	counter: async ({ cookies }) => {
		let count = +(cookies.get('enhance-counter') ?? 0);

		count += 1;

		cookies.set('enhance-counter', count + '', {
			path: '/actions/enhance'
		});

		return {};
	}
};
