import { form } from '$app/server';
import * as v from 'valibot';

export const set_favourite = form(
	v.object({
		lang: v.array(v.picklist(['js', 'ts', 'py']))
	}),
	async (data) => {
		return { lang: data.lang };
	}
);
