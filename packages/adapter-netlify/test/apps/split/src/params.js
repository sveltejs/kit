import { defineParams } from '@sveltejs/kit/params';

export const params = defineParams({
	nonempty: (param) => param || undefined
});
