/** @import { Transport } from '@sveltejs/kit' */
import * as devalue from 'devalue';

/** @type {(data: any) => string} */
export let stringify = () => '';

/** @type {(data: string) => any} */
export let parse = () => {};

/** @type {Record<string, (data: any) => any>} */
export let encoders = {};

/** @type {Record<string, (data: any) => any>} */
export let decoders = {};

/**
 *
 * @param {Transport} transport
 */
export function init_transport(transport) {
	const transporters = Object.entries(transport);

	encoders = Object.fromEntries(transporters.map(([k, v]) => [k, v.encode]));
	decoders = Object.fromEntries(transporters.map(([k, v]) => [k, v.decode]));

	stringify = (data) => devalue.stringify(data, encoders);
	parse = (data) => devalue.parse(data, decoders);
}
