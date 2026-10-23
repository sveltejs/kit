import { query } from '$app/server';
import * as v from 'valibot';

export const get_index = query(v.string(), (index) => index);
