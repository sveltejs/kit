import { defineParams } from '@sveltejs/kit';
import * as v from 'valibot';

export const params = defineParams({
	/**
	 * @param {string} param
	 * @returns {'a' | 'b'}
	 */
	narrowed: (param) => {
		if (!['a', 'b'].includes(param)) throw new Error('Invalid param');
		return /** @type {'a' | 'b'} */ (param);
	},
	not_narrowed: () => true,
	number: v.pipe(v.string(), v.toNumber())
});
