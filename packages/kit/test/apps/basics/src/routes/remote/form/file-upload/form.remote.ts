import { form } from '$app/server';
import * as v from 'valibot';

export const upload = form(
	v.object({
		text: v.string(),
		file1: v.file(),
		deep: v.object({
			files: v.array(v.file())
		}),
		read_files: v.optional(v.boolean())
	}),
	async (data) => {
		if (!data.read_files) {
			return {
				text: data.text,
				file1: data.file1.size,
				file2: data.deep.files.map((f) => f.size)
			};
		}
		return {
			text: data.text,
			file1: await data.file1.text(),
			files: await Promise.all(data.deep.files.map((f) => f.text()))
		};
	}
);
