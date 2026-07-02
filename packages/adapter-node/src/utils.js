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
