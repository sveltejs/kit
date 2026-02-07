import { form } from '$app/server';
import * as v from 'valibot';

export const create = form(v.object({ name: v.string() }), async (data: { name: string }) => {
	return 'created: ' + data.name;
});
