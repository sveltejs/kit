/** @import { RemoteFunctionData, RequestState } from 'types' */

import { Redirect } from '@sveltejs/kit/internal';
import { create_remote_key } from '../../shared.js';
import { error_to_status } from './response.js';

/**
 * Collects all the query/prerender data that was retrieved
 * during the request and adds it to `data`
 * @param {RemoteFunctionData} data
 * @param {RequestState} state
 * @param {(error: unknown) => Promise<App.Error>} handle_error
 * @returns {Promise<RemoteFunctionData>}
 */
export async function collect_remote_data(data, state, handle_error) {
	/**
	 *
	 * @param {unknown} error
	 * @returns {Promise<[status: number, error: App.Error]>}
	 */
	async function convert_error(error) {
		return [error_to_status(error), await handle_error(error)];
	}

	/** @type {Promise<any>[]} */
	const promises = [];

	if (state.remote.explicit) {
		for (const [remote_key, { internals, promise }] of state.remote.explicit) {
			// there were explicit refreshes/reconnects (via `refresh()`/`set()`/`reconnect()`),
			// so the client should apply these single-flight updates instead of calling `invalidateAll()`
			data.r = true;

			const type = /** @type {'p' | 'q' | 'l'} */ (
				internals.type === 'query_live' ? 'l' : internals.type[0]
			);

			await promise.then(
				(v) => {
					((data[type] ??= {})[remote_key] ??= {}).v = v;
				},
				async (e) => {
					if (e instanceof Redirect) {
						// already handled elsewhere
						return;
					}

					((data[type] ??= {})[remote_key] ??= {}).e = await convert_error(e);
				}
			);
		}
	}

	await Promise.all(promises);

	if (state.remote.implicit) {
		for (const [internals, record] of state.remote.implicit) {
			// Private (non-exported) remote functions have no `id` and must never be
			// serialized into the response — otherwise their (potentially private) result
			// would be shipped to the client under a malformed `undefined/...` key.
			if (!internals.id) continue;

			for (const key in record) {
				// form outputs are registered under the client-side action id directly
				const remote_key = internals.type === 'form' ? key : create_remote_key(internals.id, key);

				const type = /** @type {'p' | 'q' | 'l' | 'f'} */ (
					internals.type === 'query_live' ? 'l' : internals.type[0]
				);

				const promise = state.remote.data?.get(internals)?.[key] ?? record[key]();

				// If the promise is still pending (e.g. the query was rendered in its loading
				// state during SSR), omit it from the payload entirely so that the client
				// fetches it itself — an entry without `v`/`e` would hydrate as `undefined`.
				let resolved = true;

				await Promise.race([
					Promise.resolve(promise).then(
						(v) => {
							if (resolved) {
								((data[type] ??= {})[remote_key] ??= {}).v = v;
							}
						},
						(e) => {
							if (e instanceof Redirect) {
								// already handled elsewhere
								return;
							}

							if (resolved) {
								promises.push(
									convert_error(e).then((e) => {
										((data[type] ??= {})[remote_key] ??= {}).e = e;
									})
								);
							}
						}
					),
					Promise.resolve().then(() => (resolved = false))
				]);
			}
		}
	}

	await Promise.all(promises);

	return data;
}
