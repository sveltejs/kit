import { form } from '$app/server';
import * as v from 'valibot';

export const values = form(
	v.object({
		leaf: v.string(),
		object: v.object({
			leaf: v.string(),
			array: v.array(v.string())
		}),
		array: v.array(
			v.object({
				leaf: v.string()
			})
		)
	}),
	async (data) => {
		return { success: true, data };
	}
);
