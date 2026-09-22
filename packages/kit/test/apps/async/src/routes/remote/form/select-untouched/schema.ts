import * as v from 'valibot';

export const schema = v.object({
	picked: v.optional(v.string(), ''),
	text: v.optional(v.string(), '')
});
