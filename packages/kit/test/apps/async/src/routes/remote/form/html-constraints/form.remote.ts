import { form } from '$app/server';
import * as v from 'valibot';

export const validate_code = form(
	v.object({
		code: v.string()
	}),
	async (data) => {
		return data.code;
	}
);

export const validate_code_preflight = form(
	v.object({
		code: v.string()
	}),
	async (data) => {
		return data.code;
	}
);
