import { form, getRequestEvent } from '$app/server';
import * as v from 'valibot';

const deferreds: Array<PromiseWithResolvers<void>> = [];

export const update = form(
	v.object({
		a: v.object({
			b: v.object({
				c: v.string()
			})
		})
	}),
	async (data) => {
		// hold the submission open until `release` is called, so that the test
		// can mutate the form state while the submission is in flight
		if (getRequestEvent().isRemoteRequest) {
			const deferred = Promise.withResolvers<void>();
			deferreds.push(deferred);
			await deferred.promise;
		}

		return data.a.b.c;
	}
);

export const release = form(v.object({}), () => {
	for (const deferred of deferreds) {
		deferred.resolve();
	}
	deferreds.length = 0;
});
