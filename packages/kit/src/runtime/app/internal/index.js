/** @import { Transport } from '@sveltejs/kit' */
import * as devalue from 'devalue';

/** @type {(data: any) => string} */
export let stringify = () => '';

/** @type {Record<string, (data: any) => any>} */
export let encoders = {};

/**
 *
 * @param {Transport} transport
 */
export function init_transport(transport) {
	const transporters = Object.entries(transport);

	encoders = Object.fromEntries(transporters.map(([k, v]) => [k, v.encode]));
	stringify = (data) => devalue.stringify(data, encoders);
}
