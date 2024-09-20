export function load({ params, platform }) {
	const cf = /** @type any */ (platform).cf;
	const key = params?.key;
	const value = key && key in cf ? JSON.stringify(cf[key]) : undefined;

	return { key, value, keys: Object.keys(cf) };
}
