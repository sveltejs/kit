export const ssr = false;

let count = 0;

/** @type {import("./$types").PageLoad} */
export function load({ depends }) {
	depends('multiple:invalidations-go-brr');
	return { count: count++ };
}
