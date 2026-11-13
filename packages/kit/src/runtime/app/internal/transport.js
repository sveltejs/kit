/** @import { Transport } from '@sveltejs/kit/hooks' */
import * as devalue from 'devalue';
import { DEV } from 'esm-env';

/** @type {(thing: any) => string} */
export let uneval = () => {
	throw new Error(DEV ? 'called uneval before init_transport' : '');
};

/** @type {(data: any) => string} */
export let stringify = () => {
	throw new Error(DEV ? 'called stringify before init_transport' : '');
};

/** @type {(data: string) => any} */
export let parse = () => {
	throw new Error(DEV ? 'called parse before init_transport' : '');
};

/** @type {Record<string, (data: any) => any>} */
export let encoders = {};

/** @type {Record<string, (data: any) => any>} */
export let decoders = {};

export let has_custom_transporters = false;

/**
 * The context passed to `decode` for a value that didn't come from a remote function call
 * @type {Readonly<{ call: undefined }>}
 */
const NO_CALL = Object.freeze({ call: undefined });

/**
 *
 * @param {Transport} transport
 */
export function init_transport(transport) {
	const transporters = Object.entries(transport);

	has_custom_transporters = transporters.length > 0;

	/** @param {unknown} thing */
	const replacer = (thing) => {
		for (const key of Object.keys(transport)) {
			const encoded = transport[key].encode(thing);
			if (encoded) {
				return `app.decode('${key}', ${devalue.uneval(encoded, replacer)})`;
			}
		}
	};

	encoders = Object.fromEntries(transporters.map(([k, v]) => [k, v.encode]));
	// values parsed here never come from a remote function call on the client
	decoders = Object.fromEntries(
		transporters.map(([k, v]) => [k, (/** @type {any} */ data) => v.decode(data, NO_CALL)])
	);

	uneval = (data) => devalue.uneval(data, replacer);
	stringify = (data) => devalue.stringify(data, encoders);
	parse = (data) => devalue.parse(data, decoders);
}
