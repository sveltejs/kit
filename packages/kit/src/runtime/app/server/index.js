import { read_asset, manifest } from '__sveltekit/server';
import { base } from '__sveltekit/paths';

/**
 * Read the contents of an imported asset
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
 */
export function read(asset) {
	if (!read_asset) {
		throw new Error(
			'No `read` implementation was provided. Please ensure that your adapter is up to date and supports this feature'
		);
	}

	// handle inline assets internally
	if (asset.startsWith('data:')) {
		const [prelude, data] = asset.split(';');
		const type = prelude.slice(5) || 'application/octet-stream';

		const decoded = data.startsWith('base64,') ? atob(data.slice(7)) : decodeURIComponent(data);

		return new Response(decoded, {
			headers: {
				'Content-Length': decoded.length.toString(),
				'Content-Type': type
			}
		});
	}

	const file = asset.slice(base.length + 1);

	if (file in manifest._.server_assets) {
		const length = manifest._.server_assets[file];
		const type = manifest.mimeTypes[file.slice(file.lastIndexOf('.'))];

		return new Response(read_asset(file), {
			headers: {
				'Content-Length': '' + length,
				'Content-Type': type
			}
		});
	}

	throw new Error(`Asset does not exist: ${file}`);
}
