import { getRequestEvent } from '$app/server';

export async function load() {
	const e1 = getRequestEvent();
	await Promise.resolve();
	const e2 = getRequestEvent(); // check AsyncLocalStorage works

	if (e1 !== e2) {
		throw new Error('e1 !== e2');
	}

	return {
		message: e1.locals.message
	};
}

export const actions = {
	default: async () => {
		const { request } = getRequestEvent();
		const data = await request.formData();

		return {
			message: `from form: ${data.get('message')}`
		};
	}
};
