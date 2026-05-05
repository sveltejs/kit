import { app_dir, base } from '$app/paths/internal/client';
import { app } from '../../client.js';
import { get_remote_request_headers, handle_side_channel_response } from '../shared.svelte.js';
import * as devalue from 'devalue';
import { HttpError } from '@sveltejs/kit/internal';
import { noop } from '../../../../utils/functions.js';
import { read_ndjson } from '../../ndjson.js';

/**
 * @param {Response} response
 * @returns {Promise<ReadableStreamDefaultReader<Uint8Array>>}
 */
async function get_stream_reader(response) {
	const content_type = response.headers.get('content-type') ?? '';

	if (response.ok && content_type.includes('application/json')) {
		// we can end up here if we e.g. redirect in `handle`
		const result = await response.json();
		await handle_side_channel_response(result);
		throw new HttpError(500, 'Invalid query.live response');
	}

	if (!response.ok) {
		const result = await response.json().catch(() => ({
			type: 'error',
			status: response.status,
			error: response.statusText
		}));

		throw new HttpError(result.status ?? response.status ?? 500, result.error);
	}

	if (!response.body) {
		throw new Error('Expected query.live response body to be a ReadableStream');
	}

	return response.body.getReader();
}

/**
 * Yields deserialized results from a ReadableStream of newline-delimited JSON
 * @param {ReadableStreamDefaultReader<Uint8Array>} reader
 */
async function* read_live_ndjson(reader) {
	for await (const node of read_ndjson(reader)) {
		if (node.type === 'result') {
			yield devalue.parse(node.result, app.decoders);
			continue;
		}

		await handle_side_channel_response(node);
		throw new HttpError(500, 'Invalid query.live response');
	}
}

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
	/** @type {ReadableStreamDefaultReader<Uint8Array> | null} */
	let reader = null;

	try {
		const response = await fetch(url, {
			headers: get_remote_request_headers(),
			signal: controller.signal
		});
		reader = await get_stream_reader(response);

		on_connect();

		yield* read_live_ndjson(reader);
	} finally {
		try {
			await reader?.cancel();
		} catch {
			// already closed
		}
	}
}
