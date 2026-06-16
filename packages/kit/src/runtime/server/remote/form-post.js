/** @import { ActionResult, RemoteForm, RequestEvent, SSRManifest } from '@sveltejs/kit' */
/** @import { RemoteFormInternals, RequestState } from 'types' */

import { SvelteKitError, Redirect } from '@sveltejs/kit/internal';
import { with_request_store, merge_tracing } from '@sveltejs/kit/internal/server';
import { DEV } from 'esm-env';
import { record_span } from '../../telemetry/record_span.js';
import { normalize_error } from '../../../utils/error.js';
import { check_incorrect_fail_use } from '../page/actions.js';
import { deserialize_binary_form } from '../../form-utils.js';

/** @type {typeof handle_remote_form_post_internal} */
export async function handle_remote_form_post(event, state, manifest, id) {
	return record_span({
		name: 'sveltekit.remote.form.post',
		attributes: {
			'sveltekit.remote.form.post.id': id
		},
		fn: (current) => {
			const traced_event = merge_tracing(event, current);
			return with_request_store({ event: traced_event, state }, () =>
				handle_remote_form_post_internal(traced_event, state, manifest, id)
			);
		}
	});
}

/**
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {SSRManifest} manifest
 * @param {string} id
 * @returns {Promise<ActionResult>}
 */
async function handle_remote_form_post_internal(event, state, manifest, id) {
	// `hash` and `name` can never contain a `/`, but the JSON-stringified key of a
	// keyed (`form.for(key)`) instance can — rejoin the remaining segments
	const [hash, name, ...rest] = id.split('/');
	const action_id = rest.join('/');
	const remotes = manifest._.remotes;
	const module = await remotes[hash]?.();

	let form = /** @type {RemoteForm<any, any>} */ (module?.default[name]);

	if (!form) {
		event.setHeaders({
			// https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
			// "The server must generate an Allow header field in a 405 status code response"
			allow: 'GET'
		});
		return {
			type: 'error',
			error: new SvelteKitError(
				405,
				'Method Not Allowed',
				`POST method not allowed. No form actions exist for ${DEV ? `the page at ${event.route.id}` : 'this page'}`
			)
		};
	}

	if (action_id) {
		// @ts-expect-error
		form = with_request_store({ event, state }, () => form.for(JSON.parse(action_id)));
	}

	try {
		const fn = /** @type {RemoteFormInternals} */ (/** @type {any} */ (form).__).fn;

		const { data, meta, form_data } = await deserialize_binary_form(event.request);

		if (action_id && !('id' in data)) {
			data.id = JSON.parse(decodeURIComponent(action_id));
		}

		await with_request_store(
			{ event, state: { ...state, is_in_remote_form_or_command: true } },
			() => fn(data, meta, form_data)
		);

		// We don't want the data to appear on `let { form } = $props()`, which is why we're not returning it.
		// It is instead available on `myForm.result`, setting of which happens within the remote `form` function.
		return {
			type: 'success',
			status: 200
		};
	} catch (e) {
		const err = normalize_error(e);

		if (err instanceof Redirect) {
			return {
				type: 'redirect',
				status: err.status,
				location: err.location
			};
		}

		return {
			type: 'error',
			error: check_incorrect_fail_use(err)
		};
	}
}
