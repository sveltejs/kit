import { read_implementation, peers, publish_implementation, manifest } from '__sveltekit/server';
import { base } from '__sveltekit/paths';
import { DEV } from 'esm-env';
import { b64_decode } from '../../utils.js';

/**
 * Read the contents of an imported asset from the filesystem.
 * @example
 * ```js
 * import { read } from '$app/server';
 * import somefile from './somefile.txt';
 *
 * const asset = read(somefile);
 * const text = await asset.text();
 * ```
 * @param {string} asset
 * @returns {Response}
 * @since 2.4.0
 */
export function read(asset) {
	__SVELTEKIT_TRACK__('$app/server:read');

	if (!read_implementation) {
		throw new Error(
			'No `read` implementation was provided. Please ensure that your adapter is up to date and supports this feature'
		);
	}

	// handle inline assets internally
	const match = /^data:([^;,]+)?(;base64)?,/.exec(asset);
	if (match) {
		const type = match[1] ?? 'application/octet-stream';
		const data = asset.slice(match[0].length);

		if (match[2] !== undefined) {
			const decoded = b64_decode(data);

			return new Response(decoded, {
				headers: {
					'Content-Length': decoded.byteLength.toString(),
					'Content-Type': type
				}
			});
		}

		const decoded = decodeURIComponent(data);

		return new Response(decoded, {
			headers: {
				'Content-Length': decoded.length.toString(),
				'Content-Type': type
			}
		});
	}

	const file = decodeURIComponent(
		DEV && asset.startsWith('/@fs') ? asset : asset.slice(base.length + 1)
	);

	if (file in manifest._.server_assets) {
		const length = manifest._.server_assets[file];
		const type = manifest.mimeTypes[file.slice(file.lastIndexOf('.'))];

		return new Response(read_implementation(file), {
			headers: {
				'Content-Length': '' + length,
				'Content-Type': type
			}
		});
	}

	throw new Error(`Asset does not exist: ${file}`);
}

/**
 * Returns a set of connected WebSocket peers.
 * See [Peer](https://crossws.unjs.io/guide/peer) for more information.
 * @example
 * ```js
 * import { getPeers } from '$app/server';
 *
 * const peers = getPeers();
 * peers.forEach((peer) => {
 *   // ...
 * });
 * ```
 * @returns {import('crossws').AdapterInstance['peers']}
 * @since 2.20.0
 */
export function getPeers() {
	__SVELTEKIT_TRACK__('$app/server:getPeers');

	if (!peers) {
		throw new Error(
			'No `peers` reference was provided. Please ensure that your adapter is up to date and supports this feature'
		);
	}

	return peers;
}

/**
 * Send a message to WebSocket peer subscribers of a given topic.
 * See [Pub / Sub](https://crossws.unjs.io/guide/pubsub) for more information.
 * @example
 * ```js
 * import { publish } from '$app/server';
 *
 * publish('chat', { message: 'Hello, world!' });
 * ```
 * @param {string} topic
 * @param {unknown} data
 * @param {{ compress?: boolean }=} options
 * @returns {void}
 * @since 2.20.0
 */
export function publish(topic, data, options) {
	__SVELTEKIT_TRACK__('$app/server:publish');

	if (!publish_implementation) {
		throw new Error(
			'No `publish` implementation was provided. Please ensure that your adapter is up to date and supports this feature'
		);
	}

	publish_implementation(topic, data, options);
}
