import { form } from '$app/server';
import * as v from 'valibot';

export const image_validate_form = form(
	v.object({
		name: v.pipe(v.string(), v.minLength(1)),
		position: v.object({
			x: v.number(),
			y: v.number()
		})
	}),
	({ name, position }) => `${name}:${position.x},${position.y}`
);
