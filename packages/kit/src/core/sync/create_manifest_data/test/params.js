import { defineParams } from '@sveltejs/kit/params';

export const params = defineParams({
	foo: () => true,
	bar: () => true
});
