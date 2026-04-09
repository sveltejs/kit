import { form } from '$app/server';
import * as v from 'valibot';

export const test_form = form(v.object({ name: v.string() }), async (data) => {});
