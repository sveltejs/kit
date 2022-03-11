const v4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const v6 = /^([a-f0-9]+:|:){1,8}(:|[a-f0-9]*)?/;

/**
 * Determines if a string resembles an IP address. It does _not_ check that
 * the IP address is valid, since that's a much more complex task and
 * it's not really necessary here
 * @param {string | void} str
 */
function is_ip_like(str) {
	return str ? v4.test(str) || v6.test(str) : false;
}

/**
 * Extract the client IP address from an x-forwarded-for header
 * @param {string | void} str
 */
function extract_from_x_forwarded_for(str) {
	if (!str) return null;

	return str
		.split(', ')
		.map((address) => {
			// strip port, if this is an IPv4 address
			const parts = address.split(':');
			if (parts.length === 2) return parts[0];

			return address;
		})
		.find(is_ip_like);
}

const candidates = [
	'cf-connecting-ip',
	'fastly-client-ip',
	'true-client-ip',
	'x-real-ip',
	'x-cluster-client-ip',
	'x-forwarded',
	'forwarded-for',
	'forwarded'
];

/** @param {import('http').IncomingMessage} req */
export function get_client_address(req) {
	const headers = /** @type {Record<string, string | void>} */ (req.headers);

	// this follows the order of checks from https://github.com/pbojinov/request-ip/blob/master/src/index.js

	if (is_ip_like(headers['x-client-ip'])) {
		return headers['x-client-ip'];
	}

	{
		const address = extract_from_x_forwarded_for(headers['x-forwarded-for']);
		if (address) return address;
	}

	for (const candidate of candidates) {
		const value = headers[candidate];
		if (is_ip_like(value)) return value;
	}

	return (
		req.connection?.remoteAddress ||
		// @ts-expect-error
		req.connection?.socket?.remoteAddress ||
		req.socket?.remoteAddress ||
		// @ts-expect-error
		req.info?.remoteAddress
	);
}
