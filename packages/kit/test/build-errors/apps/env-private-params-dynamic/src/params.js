import { defineParams } from '@sveltejs/kit/params';

export const params = defineParams({
	gate: async (param) => {
		const { is_allowed } = await import('./lib/server/allow.js');
		return is_allowed(param) ? param : undefined;
	}
});
