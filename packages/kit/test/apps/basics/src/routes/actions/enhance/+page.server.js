/** @type {import('./$types').PageServerLoad} */
export function load() {
	return {
		initial: 'initial'
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
	}
};
