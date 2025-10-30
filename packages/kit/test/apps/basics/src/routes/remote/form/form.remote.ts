import { form, getRequestEvent, query } from '$app/server';
import { error, redirect } from '@sveltejs/kit';
import * as v from 'valibot';

let message = 'initial';
const deferreds = [];

export const get_message = query(() => {
	return message;
});

export const set_message = form(
	v.object({
		id: v.optional(v.string()),
		message: v.picklist(
			['hello', 'goodbye', 'unexpected error', 'expected error', 'redirect'],
			'message is invalid'
		),
		uppercase: v.optional(v.string())
	}),
	async (data) => {
		if (data.message === 'unexpected error') {
			throw new Error('oops');
		}

		if (data.message === 'expected error') {
			error(500, 'oops');
		}

		if (data.message === 'redirect') {
			redirect(303, '/remote');
		}

		message = data.uppercase === 'true' ? data.message.toUpperCase() : data.message;

		if (getRequestEvent().isRemoteRequest) {
			const deferred = Promise.withResolvers();
			deferreds.push(deferred);
			await deferred.promise;
		}

		return message + (data.id ? ` (from: ${data.id})` : '');
	}
);

export const set_reverse_message = form(v.object({ message: v.string() }), (data) => {
	message = data.message.split('').reverse().join('');
	return message;
});

export const resolve_deferreds = form(async () => {
	for (const deferred of deferreds) {
		deferred.resolve();
	}
	deferreds.length = 0;
});
