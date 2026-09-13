import { prerender } from '$app/server';

export const throws = prerender(() => {
	if (process.env.PRERENDER_INPUTS_ERROR) return ['value'];
	throw new Error('remote function blew up');
});

export const from_inputs = prerender('unchecked', (value: string) => value, {
	inputs: () => {
		if (process.env.PRERENDER_INPUTS_ERROR === 'async') {
			return Promise.resolve().then(() => throws());
		}
		return process.env.PRERENDER_INPUTS_ERROR ? throws() : [];
	}
});

export { from_inputs as same_inputs };
