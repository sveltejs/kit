import { defineParams } from '@sveltejs/kit/params';
import * as v from 'valibot';

export const params = defineParams({
	narrowed: (param) => {
		if (!['a', 'b'].includes(param)) return;
		return /** @type {'a' | 'b'} */ (param);
	},
	'hyphenated-matcher': (param) => {
		if (!['a', 'b'].includes(param)) return;
		return /** @type {'a' | 'b'} */ (param);
	},
	boolean: () => /** @type {boolean} */ (true),
	number: v.pipe(v.string(), v.toNumber())
});
