import { form } from '$app/server';
import * as v from 'valibot';

export const my_form = form(
	v.object({
		submitter: v.string()
	}),
	async (data) => {
		console.log('!!!', data);
		return data.submitter;
	}
);

export const image_form = form(
	v.object({
		position: v.object({
			x: v.number(),
			y: v.number()
		})
	}),
	({ position }) => `${position.x},${position.y}`
);
