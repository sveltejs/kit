import { HttpError } from '@sveltejs/kit/internal';
import { app, query_map } from '../client.js';
import { stringify_remote_arg } from '../../shared.js';
import { query } from './query/index.js';

/**
 * Returns a devalue revivers map that includes the user-defined transport
 * decoders plus the built-in `__skq` decoder for serialized `RemoteQuery`
 * instances. Use this — not `app.decoders` directly — when parsing a
 * remote function response, so that nested query instances in the response
 * become live `QueryProxy` instances on the client.
 *
 * Scoped to remote-function call sites on purpose: parsing a load function
 * payload, or any other devalue stream that wasn't produced by the remote
 * function response pipeline, must NOT magically reify query instances.
 */
export function create_query_value_revivers() {
	return {
		...app.decoders,
		/**
		 * Wire shape (produced server-side by `stringify_with_remote_queries`):
		 * `[id, arg, data, error?, status?]`. Reconstructs a `QueryProxy` for
		 * `(id, arg)` (sharing identity with any direct `myQuery(arg)` call),
		 * then seeds its underlying `Query` with the inlined data — or fails
		 * it with the inlined error.
		 *
		 * @param {[string, any, any?, any?, number?]} data
		 */
		__skq: ([id, arg, data, error, status]) => {
			const factory = query(id);
			const proxy = factory(arg);

			const payload = stringify_remote_arg(arg, app.hooks.transport);
			const cached = query_map.get(id)?.get(payload);

			if (cached) {
				if (error !== undefined) {
					cached.resource.fail(new HttpError(status ?? 500, error));
				} else {
					cached.resource.set(data);
				}
			}

			return proxy;
		}
	};
}
