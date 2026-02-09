import { do_something } from './action.remote';

export const actions = {
	default: async ({ request }) => {
		const fields = await request.formData();
		const result = await do_something(fields.get('input') as string);
		return { result };
	}
};
