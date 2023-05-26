export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		console.log(data.get('file'));
	}
};
