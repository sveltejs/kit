import { defineParams } from '@sveltejs/kit/params';
import { secret } from '#lib/server/secret.js';

export const params = defineParams({
	gate: (param) => (param === secret ? param : undefined)
});
