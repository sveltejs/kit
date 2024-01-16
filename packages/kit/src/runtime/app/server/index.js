import { read_asset } from '__sveltekit/server';

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
				'Content-Type': type,
				'Content-Length': decoded.length.toString()
			}
		});
	}

	// for everything else, delegate to adapter
	return read_asset(file);
}
