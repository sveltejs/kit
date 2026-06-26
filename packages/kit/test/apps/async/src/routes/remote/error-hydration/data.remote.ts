import { query } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';

export const failing = query(() => {
	error(418, 'teapot');
});

export const failing_batch = query.batch(v.string(), () => {
	return () => {
		error(418, 'batch teapot');
	};
});
