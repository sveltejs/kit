import { defineParams } from '@sveltejs/kit';

export const params = defineParams({
	lowercase: (param) => {
		if (!/^[a-z]+$/.test(param)) throw new Error('Invalid param');
		return param;
	},
	uppercase: (param) => {
		if (!/^[A-Z]+$/.test(param)) throw new Error('Invalid param');
		return param;
	},
	numeric: (param) => {
		const value = parseInt(param);
		if (isNaN(value)) throw new Error('Invalid param');
		return value;
	}
});
