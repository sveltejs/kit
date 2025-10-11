import { form, query } from '$app/server';
import * as v from 'valibot';

let hidden = {
	string: 'a',
	number: 0,
	boolean: false
};

export const get_hidden = query(() => {
	return hidden;
});

export const set_hidden = form(
	v.object({
		string: v.string(),
		number: v.number(),
		boolean: v.boolean()
	}),
	async (data) => {
		hidden = data;
		get_hidden().refresh();
	}
);
