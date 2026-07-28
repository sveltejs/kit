/** @import { RemoteFunctionResponse } from 'types' */
import { app_dir, base } from '$app/paths/internal/client';
import { app } from '../../client.js';
import { notify_version } from '../../state.svelte.js';
import { handle_side_channel_response } from '../shared.svelte.js';
import * as devalue from 'devalue';
import { HttpError } from '@sveltejs/kit/internal';
import { noop } from '../../../../utils/functions.js';
import { read_sse } from '../../sse.js';

/**
 * @template T
 * @param {string} id
 * @param {string} payload
 * @param {AbortController} [controller]
 * @param {() => void} [on_connect]
 * @returns {AsyncGenerator<T>}
 */
export async function* create_live_iterator(
	id,
	payload,
	controller = new AbortController(),
	on_connect = noop
) {
	const url = `${base}/${app_dir}/remote/${id}${payload ? `?payload=${payload}` : ''}`;

	const response = await fetch(url, {
		signal: controller.signal
	});

	// detect new deployments from the response header
	notify_version(response.headers.get('x-sveltekit-version'));

	if (!response.ok) {
		/** @type {RemoteFunctionResponse | undefined} */
		const result = await response.json().catch(() => undefined);

		throw new HttpError(
			result?.type === 'error'
				? result.error
				: { status: response.status, message: response.statusText }
		);
	}

	if (response.headers.get('content-type')?.includes('application/json')) {
		// we can end up here if we e.g. redirect in `handle`
		const result = await response.json();
		await handle_side_channel_response(result);
		throw new HttpError({ status: 500, message: 'Invalid query.live response' });
	}

	if (!response.body) {
		throw new Error('Expected query.live response body to be a ReadableStream');
	}

	const reader = response.body.getReader();

	try {
		on_connect();

		for await (const node of read_sse(reader)) {
			if (node.type === 'result') {
				yield devalue.parse(node.result, app.decoders);
				continue;
			}

			await handle_side_channel_response(node);
			throw new HttpError({ status: 500, message: 'Invalid query.live response' });
		}
	} finally {
		try {
			await reader.cancel();
		} catch {
			// already closed
		}
	}
}
