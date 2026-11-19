import { defineParams } from '@sveltejs/kit/params';

export const params = defineParams({
	known: (param) => (param === 'known' ? param : undefined)
});
