import * as v from 'valibot';

export const schema = v.object({
	picked: v.pipe(v.string(), v.minLength(1, 'pick one')),
	text: v.pipe(v.string(), v.maxLength(3, 'too long'))
});
