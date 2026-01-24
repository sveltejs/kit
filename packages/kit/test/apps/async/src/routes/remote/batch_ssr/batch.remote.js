import { query } from '$app/server';
import * as v from 'valibot';

export const getData = query.batch(v.pipe(v.string(), v.toDate()), () => {
	return (x) => typeof x;
});
