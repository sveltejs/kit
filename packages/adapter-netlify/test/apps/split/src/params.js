import { defineParams } from '@sveltejs/kit/params';

export const params = defineParams({
	integer: (value) => (/^\d+$/.test(value) ? value : undefined)
});
