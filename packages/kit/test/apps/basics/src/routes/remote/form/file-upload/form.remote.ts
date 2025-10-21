import { form } from '$app/server';
import * as v from 'valibot';

export const upload = form(
	v.object({
		text: v.string(),
		file: v.file()
	}),
	async (data) => {
		console.log(data.text);
		console.log(data.file);
		console.log(await data.file.text());
	}
);
