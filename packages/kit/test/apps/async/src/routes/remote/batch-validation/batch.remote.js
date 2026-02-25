import { query } from '$app/server';
import * as v from 'valibot';

export const reverse = query.batch(
	v.pipe(
		v.string(),
		v.transform((val) => val.split('').reverse().join(''))
	),
	() => {
		return (x) => x;
	}
);
