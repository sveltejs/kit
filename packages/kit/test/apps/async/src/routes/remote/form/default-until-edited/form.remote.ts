import { form } from '$app/server';
import * as v from 'valibot';

export const edit = form(v.object({ amount: v.optional(v.number()) }), async () => {});
