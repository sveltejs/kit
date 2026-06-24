import { form } from '$app/server';
import * as v from 'valibot';

export const my_form = form(
	v.object({
		quantity: v.number()
	}),
	async (data) => {
		return data.quantity;
	}
);
