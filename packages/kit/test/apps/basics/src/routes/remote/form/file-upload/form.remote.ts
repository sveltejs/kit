import { form } from '$app/server';
import * as v from 'valibot';

export const upload = form(
	v.object({
		text: v.string(),
		file1: v.file(),
		file2: v.file()
	}),
	async (data) => {
		console.log(data.text);
		console.log(data.file1);
		console.log(data.file2);
		console.log(await data.file1.text());
		console.log(await data.file2.text());
		// for await (const chunk of data.file1.stream()) {
		// 	console.log('file 1', chunk.length);
		// }
	}
);
