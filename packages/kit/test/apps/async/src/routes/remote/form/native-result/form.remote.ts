import { form } from '$app/server';
import * as v from 'valibot';

export const echo = form(
	v.object({ message: v.pipe(v.string(), v.minLength(3, 'too short')) }),
	({ message }) => {
		return `echo: ${message}`;
	}
);
