import { query } from '$app/server';
import * as v from 'valibot';

export const single = query(v.number(), (n) => n);
export const batch = query.batch(v.number(), () => (n) => n);
