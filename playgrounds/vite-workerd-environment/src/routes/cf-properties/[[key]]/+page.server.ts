import type { PageServerLoadEvent } from './$types';

export function load({ params, platform }: PageServerLoadEvent) {
	const cf = platform.cf;
	const key = params?.key;
	const value = key && key in cf ? JSON.stringify(cf[key]) : undefined;

	return { key, value, keys: Object.keys(cf) };
}
