import { defineParams } from '@sveltejs/kit/params';
import { fruits } from '#lib/fruits.js';

export const params = defineParams({
	lowercase: (param) => {
		if (!/^[a-z]+$/.test(param)) return;
		return param;
	},
	uppercase: (param) => {
		if (!/^[A-Z]+$/.test(param)) return;
		return param;
	},
	numeric: (param) => {
		const value = parseInt(param);
		if (isNaN(value)) return;
		return value;
	},
	bigint: (param) => BigInt(param),
	fruit: (param) => {
		if (fruits.includes(param)) return param;
	}
});
