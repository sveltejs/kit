import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, platform }) => {
	const cf = platform.cf;
	const key = params?.key;
	const value = JSON.stringify(cf[key]);

	return { key, value: key && key in cf && value, keys: Object.keys(cf) };
};
