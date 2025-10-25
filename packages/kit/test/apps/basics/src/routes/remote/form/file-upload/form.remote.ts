import { form } from '$app/server';
import * as v from 'valibot';

export const upload = form(
	v.object({
		text: v.string(),
		file1: v.file(),
		file2: v.file()
	}),
	async (data) => {
		return { text: data.text, file1: await data.file1.text(), file2: await data.file2.text() };
	}
);
