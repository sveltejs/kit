/** @type {typeof import('./runtime.js').negotiateEncoding} */
export function negotiateEncoding(header, variants) {
	if (!header || !(variants.br || variants.gz)) return;

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

	const br = variants.br ? weight('br') : 0;
	const gzip = variants.gz ? weight('gzip') : 0;

	if (gzip > br) return 'gz';
	if (br > 0) return 'br';
}

/** @type {typeof import('./runtime.js').forwardedAddress} */
export function forwardedAddress({ header, value, depth, envPrefix }) {
	if (value == null) {
		throw new Error(
			`Address header was specified with ${envPrefix}ADDRESS_HEADER=${header} but is absent from request`
		);
	}

	if (header !== 'x-forwarded-for') return value;

	const addresses = value.split(',');

	if (depth < 1) {
		throw new Error(`${envPrefix}XFF_DEPTH must be a positive integer`);
	}

	if (depth > addresses.length) {
		throw new Error(
			`${envPrefix}XFF_DEPTH is ${depth}, but only found ${addresses.length} addresses`
		);
	}

	return addresses[addresses.length - depth].trim();
}
