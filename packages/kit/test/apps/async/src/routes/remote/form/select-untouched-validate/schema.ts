import * as v from 'valibot';

export const schema = v.object({
	picked: v.pipe(v.string(), v.minLength(1, 'pick one')),
	text: v.optional(v.string(), '')
});
