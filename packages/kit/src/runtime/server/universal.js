/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { RequestState, ServerActionResult, UniversalFunctionData } from 'types' */
/** @import { PageNodes } from '../../utils/page_nodes.js' */
/** @import { UniversalInternals } from '../app/universal/shared.js' */
import { Redirect } from '@sveltejs/kit/internal';
import { with_request_store } from '@sveltejs/kit/internal/server';
import { create_remote_key } from '../shared.js';
import { convert_formdata } from '../form-utils.js';
import { handle_error_and_jsonify } from './errors.js';
import {
	action_error_result,
	get_action_location,
	method_not_allowed_result
} from './page/actions.js';
import { get_universal_form } from '../app/universal/server.js';
import { UNIVERSAL_ACTION_PARAM } from '../app/universal/shared.js';

/**
 * Collects the results of universal queries that settled during the request,
 * so that they can be serialized into the page and reused during hydration.
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @returns {Promise<UniversalFunctionData>}
 */
export async function collect_universal_data(event, state) {
	/** @type {UniversalFunctionData} */
	const data = {};

	/** @type {Promise<void>[]} */
	const promises = [];

	if (state.universal.data) {
		for (const [internals, entries] of state.universal.data) {
			const { id } = /** @type {UniversalInternals} */ (internals);

			// non-exported universal functions have no id and can't be matched up on the client
			if (!id) continue;

			for (const [payload, entry] of entries) {
				// Still pending (e.g. rendered in its loading state via `.current`) — omit it,
				// the client will run the function itself
				if (!entry.settled) continue;

				const key = create_remote_key(id, payload);

				if (!entry.failed) {
					(data.q ??= {})[key] = { v: entry.value };
				} else if (!(entry.error instanceof Redirect)) {
					promises.push(
						Promise.resolve(handle_error_and_jsonify(event, state, entry.error)).then((e) => {
							(data.q ??= {})[key] = { e };
						})
					);
				}
			}
		}
	}

	if (state.universal.form_outputs) {
		for (const [action_id, output] of state.universal.form_outputs) {
			(data.f ??= {})[action_id] = output;
		}
	}

	await Promise.all(promises);

	return data;
}

/**
 * @param {URL} url
 */
export function get_universal_action(url) {
	return url.searchParams.get(UNIVERSAL_ACTION_PARAM);
}

/**
 * Handles a non-enhanced (i.e. no-JS) submission of a universal form by running its handler on the server.
 * The output (result/issues/input) is stored in the request state and rendered/serialized along with the page.
 *
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {string} action_id
 * @param {PageNodes} nodes
 * @returns {Promise<ServerActionResult>}
 */
export async function handle_universal_form_post(event, state, action_id, nodes) {
	const location = get_action_location(event.url);

	// Universal forms are defined in modules imported by the page's components. Load them,
	// so that the forms are registered and can be looked up by their id
	await Promise.all(
		nodes.data.map(async (node) => {
			await node?.component?.();
		})
	);

	// `hash` and `name` can never contain a `/`, but the JSON-stringified key of a keyed instance can
	const [hash, name, ...rest] = action_id.split('/');
	const id = `${hash}/${name}`;
	const key = rest.length > 0 ? JSON.parse(decodeURIComponent(rest.join('/'))) : undefined;

	let form = get_universal_form(id);

	if (!form) {
		return method_not_allowed_result(event, location);
	}

	try {
		const store = { event, state };

		if (key !== undefined) {
			form = with_request_store(store, () => form.for(key));
		}

		const data = convert_formdata(id, await event.request.formData());

		if (key !== undefined && !('id' in data)) {
			data.id = key;
		}

		await form.__handle(data, store);

		return { type: 'success', status: 200, location };
	} catch (e) {
		return action_error_result(e, location);
	}
}
