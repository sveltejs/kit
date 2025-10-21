import { form } from '$app/server';
import * as v from 'valibot';

export const upload = form(
	v.object({
		file: v.file()
	}),
	async () => {}
);
