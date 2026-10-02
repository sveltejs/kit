import { env_prefix } from '#@sveltejs/adapter-node';

/**
 * The client address a trusted proxy reported in `ADDRESS_HEADER`
 * @param {string} name the header's name
 * @param {string | null | undefined} value the header's value
 * @param {number} xff_depth
 * @returns {string}
 */
export function forwarded_address(name, value, xff_depth) {
	if (value == null) {
		throw new Error(
			`Address header was specified with ${env_prefix}ADDRESS_HEADER=${name} but is absent from request`
		);
	}

	if (name !== 'x-forwarded-for') return value;

	const addresses = value.split(',');

	if (xff_depth < 1) {
		throw new Error(`${env_prefix}XFF_DEPTH must be a positive integer`);
	}

	if (xff_depth > addresses.length) {
		throw new Error(
			`${env_prefix}XFF_DEPTH is ${xff_depth}, but only found ${addresses.length} addresses`
		);
	}

	return addresses[addresses.length - xff_depth].trim();
}
