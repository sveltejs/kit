export const ssr = false;

let count = 0;

export function load({ depends }) {
	depends('multiple:invalidations-go-brr');
	return { count: count++ };
}
