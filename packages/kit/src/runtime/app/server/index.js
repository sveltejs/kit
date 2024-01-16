import { read_asset, manifest } from '__sveltekit/server';

/**
 * TODO docs
 * @param {string} file
 * @returns {Response}
 */
export function readAsset(file) {
	if (!read_asset) {
		throw new Error(
			'No readAsset implementation was provided. Please ensure that your adapter is up to date and supports this feature'
		);
	}

	// handle inline assets internally
	if (file.startsWith('data:')) {
		const [prelude, data] = file.split(';');
		const type = prelude.slice(5) || 'application/octet-stream';

		const decoded = data.startsWith('base64,') ? atob(data.slice(7)) : decodeURIComponent(data);

		return new Response(decoded, {
			headers: {
				'Content-Length': decoded.length.toString(),
				'Content-Type': type
			}
		});
	}

	if (file in manifest._.files) {
		const [length, type] = manifest._.files[file];

		return new Response(read_asset(file), {
			headers: {
				'Content-Length': '' + length,
				'Content-Type': type
			}
		});
	}

	throw new Error(`Asset does not exist: ${file}`);
}
