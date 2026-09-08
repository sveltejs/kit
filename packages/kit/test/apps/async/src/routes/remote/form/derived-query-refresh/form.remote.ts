import { form, query } from '$app/server';
import * as v from 'valibot';

export const select_category = form(v.object({ category: v.string() }), ({ category }) => {
	return { category };
});

export const details = query(v.string(), (category) => category);
