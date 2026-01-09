/**
 * Parses the given value into number of bytes.
 *
 * @param {string} value - Size in bytes. Can also be specified with a unit suffix kilobytes (K), megabytes (M), or gigabytes (G).
 * @returns {number}
 */
export function parse_as_bytes(value) {
	const multiplier =
		{
			K: 1024,
			M: 1024 * 1024,
			G: 1024 * 1024 * 1024
		}[value[value.length - 1]?.toUpperCase()] ?? 1;
	return Number(multiplier != 1 ? value.substring(0, value.length - 1) : value) * multiplier;
}

/**
 * Parses and validates an origin URL.
 *
 * @param {string | undefined} value - Origin URL with http:// or https:// protocol
 * @returns {string | undefined} The validated origin, or undefined if value is undefined
 */
export function parse_origin(value) {
	if (value === undefined) {
		return undefined;
	}

	const trimmed = value.trim();

	if (trimmed === '') {
		return undefined;
	}

	try {
		const url = new URL(trimmed);

		// Verify protocol is http or https
		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			return undefined;
		}

		return url.origin;
	} catch {
		return undefined;
	}
}
