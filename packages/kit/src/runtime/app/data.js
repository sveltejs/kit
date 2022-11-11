import { unflatten, stringify } from 'devalue';

export { stringify as serialize };

/**
 * @param {string | any[] | number} serialized
 */
export function deserialize(serialized) {
	if (typeof serialized === 'string') {
		serialized = /** @type {any[] | number} */ (JSON.parse(serialized));
	}
	return unflatten(serialized);
}
