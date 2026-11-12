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
 *
 * @param {Transport} transport
 */
export function init_transport(transport) {
	const transporters = Object.entries(transport);

	has_custom_transporters = transporters.length > 0;

	/** @type {import('devalue').UnevalReplacer} */
	const replacer = (thing, js) => {
		for (const key of Object.keys(transport)) {
			const encoded = transport[key].encode(thing);
			if (encoded) {
				// in devalue v6 the replacer must return a source created with the
				// supplied `js` tag; each `${...}` hole is recursively serialized
				return js`app.decode(${key}, ${encoded})`;
			}
		}
	};

	encoders = Object.fromEntries(transporters.map(([k, v]) => [k, v.encode]));
	decoders = Object.fromEntries(transporters.map(([k, v]) => [k, v.decode]));

	uneval = (data) => devalue.uneval(data, replacer);
	stringify = (data) => devalue.stringify(data, encoders);
	parse = (data) => devalue.parse(data, decoders);
}
