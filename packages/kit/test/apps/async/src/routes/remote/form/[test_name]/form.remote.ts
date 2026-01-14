import { form, getRequestEvent, query } from '$app/server';
import { error, redirect } from '@sveltejs/kit';
import * as v from 'valibot';

const instances = new Map<
	string,
	{ message: string; deferreds: Array<PromiseWithResolvers<void>> }
>();

export const get_message = query(v.string(), (test_name) => {
	return instances.get(test_name)?.message || 'initial';
});

export const set_message = form(
	v.object({
		test_name: v.string(),
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

		const instance = instances.get(data.test_name) ?? { message: 'initial', deferreds: [] };
		instances.set(data.test_name, instance);

		instance.message = data.uppercase === 'true' ? data.message.toUpperCase() : data.message;

		if (getRequestEvent().isRemoteRequest) {
			const deferred = Promise.withResolvers<void>();
			instance.deferreds.push(deferred);
			await deferred.promise;
		}

		return instance.message + (data.id ? ` (from: ${data.id})` : '');
	}
);

export const set_reverse_message = form(
	v.object({ test_name: v.string(), message: v.string() }),
	(data) => {
		const instance = instances.get(data.test_name) ?? { message: 'initial', deferreds: [] };
		instances.set(data.test_name, instance);
		instance.message = data.message.split('').reverse().join('');
		return instance.message;
	}
);

export const resolve_deferreds = form(v.object({ test_name: v.string() }), async (data) => {
	const instance = instances.get(data.test_name);
	if (!instance) return;

	const { deferreds } = instance;
	for (const deferred of deferreds) {
		deferred.resolve();
	}
	deferreds.length = 0;
});
