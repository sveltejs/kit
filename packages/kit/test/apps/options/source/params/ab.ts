import type { ParamMatcher } from '@sveltejs/kit';

export const match = ((param): param is 'a' | 'b' => {
	return ['a', 'b'].includes(param);
}) satisfies ParamMatcher;
