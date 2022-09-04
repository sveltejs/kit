/** @type {import('./$types').PageServerLoad} */
export function load() {
	return {
		initial: 'initial'
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request }) => {
		const fields = await request.formData();
		return {
			result: fields.get('username')
		};
	}
};
