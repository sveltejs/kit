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
 * @throws {Error} If value is provided but invalid
 */
export function parse_origin(value) {
	if (value === undefined) {
		return undefined;
	}

	const trimmed = value.trim();

	if (trimmed === '') {
		throw new Error(
			`Invalid ORIGIN: empty string. ` +
				`ORIGIN must be a valid URL with http:// or https:// protocol. ` +
				`For example: 'http://localhost:3000' or 'https://my.site'`
		);
	}

	try {
		const url = new URL(trimmed);

		// Verify protocol is http or https
		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			throw new Error(
				`Invalid ORIGIN: '${trimmed}'. ` +
					`Only http:// and https:// protocols are supported. ` +
					`Received protocol: ${url.protocol}`
			);
		}

		return url.origin;
	} catch (error) {
		// Re-throw if already our custom error
		if (error instanceof Error && error.message.startsWith('Invalid ORIGIN')) {
			throw error;
		}

		// URL constructor threw - invalid URL format
		throw new Error(
			`Invalid ORIGIN: '${trimmed}'. ` +
				`ORIGIN must be a valid URL with http:// or https:// protocol. ` +
				`For example: 'http://localhost:3000' or 'https://my.site'`
		);
	}
}
