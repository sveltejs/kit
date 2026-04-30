/** @import { RemoteCommand, RemoteQueryUpdate } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse } from 'types' */
import { app_dir, base } from '$app/paths/internal/client';
import * as devalue from 'devalue';
import { HttpError } from '@sveltejs/kit/internal';
import { app } from '../client.js';
import { stringify_remote_arg } from '../../shared.js';
import {
	get_remote_request_headers,
	apply_refreshes,
	categorize_updates,
	apply_reconnections
} from './shared.svelte.js';

/**
 * Client-version of the `command` function from `$app/server`.
 * @param {string} id
 * @returns {RemoteCommand<any, any>}
 */
export function command(id) {
	/** @type {number} */
	let pending_count = $state(0);

	// Careful: This function MUST be synchronous (can't use the async keyword) because the return type has to be a promise with an updates() method.
	// If we make it async, the return type will be a promise that resolves to a promise with an updates() method, which is not what we want.
	/** @type {RemoteCommand<any, any>} */
	const command_function = (arg) => {
		let overrides = /** @type {Array<() => void> | null} */ (null);

		/** @type {Set<string> | null} */
		let refreshes = null;

		/** @type {Error | undefined} */
		let updates_error;

		// Increment pending count when command starts
		pending_count++;

		// No one should call commands during rendering, but this is belt and braces.
		// Do this here, after Svelte's reactivity context is gone.
		const headers = {
			'Content-Type': 'application/json',
			...get_remote_request_headers()
		};

		/** @type {Promise<any> & { updates: (...args: RemoteQueryUpdate[]) => Promise<any> }} */
		const promise = (async () => {
			try {
				// Wait a tick to give room for the `updates` method to be called
				await Promise.resolve();

				if (updates_error) {
					throw updates_error;
				}

				const response = await fetch(`${base}/${app_dir}/remote/${id}`, {
					method: 'POST',
					body: JSON.stringify({
						payload: stringify_remote_arg(arg, app.hooks.transport, false),
						refreshes: Array.from(refreshes ?? [])
					}),
					headers
				});

				if (!response.ok) {
					// We only end up here in case of a network error or if the server has an internal error
					// (which shouldn't happen because we handle errors on the server and always send a 200 response)
					throw new Error('Failed to execute remote function');
				}

				const result = /** @type {RemoteFunctionResponse} */ (await response.json());
				if (result.type === 'redirect') {
					throw new Error(
						'Redirects are not allowed in commands. Return a result instead and use goto on the client'
					);
				} else if (result.type === 'error') {
					throw new HttpError(result.status ?? 500, result.error);
				} else {
					if (result.refreshes) {
						apply_refreshes(result.refreshes);
					}

					if (result.reconnects) {
						apply_reconnections(result.reconnects);
					}

					return devalue.parse(result.result, app.decoders);
				}
			} finally {
				overrides?.forEach((fn) => fn());

				// Decrement pending count when command completes
				pending_count--;
			}
		})();

		let updates_called = false;
		promise.updates = (...args) => {
			if (updates_called) {
				console.warn(
					'Updates can only be sent once per command invocation. Ignoring additional updates.'
				);
				return promise;
			}
			updates_called = true;

			try {
				({ refreshes, overrides } = categorize_updates(args));
			} catch (error) {
				updates_error = /** @type {Error} */ (error);
			}

			return promise;
		};

		return promise;
	};

	Object.defineProperty(command_function, 'pending', {
		get: () => pending_count
	});

	return command_function;
}
