import { defineParams } from '@sveltejs/kit';

export const params = defineParams({
	foo: () => true,
	bar: () => true
});
