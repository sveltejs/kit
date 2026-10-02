import { format } from 'node:url';

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
 * Formats the address the server is listening on.
 *
 * @param {string | false} path
 * @param {string} host
 * @param {string | false} port
 * @param {import('node:net').AddressInfo | string | null} address
 * @returns {string}
 */
export function format_listening_address(path, host, port, address) {
	if (path) {
		return path;
	}

	if (address && typeof address === 'object') {
		return format({
			protocol: 'http:',
			hostname: address.address,
			port: address.port
		});
	}

	return format({
		protocol: 'http:',
		hostname: host,
		port: String(port)
	});
}

/**
 * Parses `Accept-Encoding` and picks the preferred variant that exists
 * @param {string | null | undefined} header
 * @param {{ br?: number | boolean, gz?: number | boolean }} asset
 * @returns {'br' | 'gz' | undefined}
 */
export function negotiate(header, asset) {
	if (!header || !(asset.br || asset.gz)) return;

	/** @type {Map<string, number>} */
	const weights = new Map();

	for (const part of header.toLowerCase().split(',')) {
		const [coding, ...params] = part.split(';');
		let weight = 1;

		for (const param of params) {
			const [name, value] = param.split('=');
			if (name.trim() === 'q') weight = parseFloat(value) || 0;
		}

		weights.set(coding.trim(), weight);
	}

	/** @param {string} coding */
	const weight = (coding) => weights.get(coding) ?? weights.get('*') ?? 0;

	const br = asset.br ? weight('br') : 0;
	const gzip = asset.gz ? weight('gzip') : 0;

	if (gzip > br) return 'gz';
	if (br > 0) return 'br';
}
