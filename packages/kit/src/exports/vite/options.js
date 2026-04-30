/** @import { Validator } from '../../core/config/types.js' */

import { object, validate } from '../../core/config/options.js';

/** @type {Validator} */
const options = object({
	adapter: validate(null, (input, keypath) => {
		if (typeof input !== 'object' || !input.adapt) {
			let message = `${keypath} should be an object with an "adapt" method`;
			throw new Error(`${message}. See https://svelte.dev/docs/kit/adapters`);
		}

		return input;
	})
});

export default options;
