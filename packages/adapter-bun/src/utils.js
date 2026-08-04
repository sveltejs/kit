/**
 * @param {string} value
 * @returns {number}
 */
export function parse_as_bytes(value) {
	const multiplier =
		{
			K: 1024,
			M: 1024 * 1024,
			G: 1024 * 1024 * 1024
		}[value[value.length - 1]?.toUpperCase()] ?? 1;

	return Number(multiplier === 1 ? value : value.slice(0, -1)) * multiplier;
}

/**
 * @param {Headers} headers
 * @param {string} value
 */
export function append_vary(headers, value) {
	const current = headers.get('vary');
	if (!current) {
		headers.set('vary', value);
		return;
	}

	const values = current.split(',').map((part) => part.trim().toLowerCase());
	if (!values.includes(value.toLowerCase()) && !values.includes('*')) {
		headers.set('vary', `${current}, ${value}`);
	}
}

/**
 * @param {string | null} header
 * @param {string} encoding
 * @returns {boolean}
 */
export function accepts_encoding(header, encoding) {
	if (!header) return false;

	/** @type {boolean | undefined} */
	let wildcard;
	for (const item of header.split(',')) {
		const [name, ...parameters] = item.trim().toLowerCase().split(';');
		let quality = 1;
		for (const parameter of parameters) {
			const match = /^q\s*=\s*(0(?:\.\d+)?|1(?:\.0+)?)$/.exec(parameter.trim());
			if (match) quality = Number(match[1]);
		}

		if (name === encoding) return quality > 0;
		if (name === '*') wildcard = quality > 0;
	}

	return wildcard ?? false;
}
