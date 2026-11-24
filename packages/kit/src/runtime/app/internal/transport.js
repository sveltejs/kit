/** @import { Transport } from '@sveltejs/kit/hooks' */
/** @import { UnevalReplacer } from 'devalue' */
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
 * Turns a value with a custom transporter into an `app.decode(...)` call
 * @type {UnevalReplacer}
 */
export function replacer(thing, js) {
	for (const key of Object.keys(encoders)) {
		const encoded = encoders[key](thing);
		if (encoded) {
			return js`app.decode(${key}, ${encoded})`;
		}
	}
}

/**
 *
 * @param {Transport} transport
 */
export function init_transport(transport) {
	const transporters = Object.entries(transport);

	has_custom_transporters = transporters.length > 0;

	encoders = Object.fromEntries(transporters.map(([k, v]) => [k, v.encode]));
	decoders = Object.fromEntries(transporters.map(([k, v]) => [k, v.decode]));

	uneval = (data) => devalue.uneval(data, replacer);
	stringify = (data) => devalue.stringify(data, encoders);
	parse = (data) => devalue.parse(data, decoders);
}
