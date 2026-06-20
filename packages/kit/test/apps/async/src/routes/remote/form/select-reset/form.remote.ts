import { form } from '$app/server';
import * as v from 'valibot';

export const set_favourite = form(
	v.object({
		normal: v.string(),
		with_default: v.string(),
		disabled_default: v.string(),
		multiple: v.array(v.picklist(['js', 'ts', 'py']))
	}),
	async (data) => {
		return data;
	}
);
