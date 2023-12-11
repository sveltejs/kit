let count = 0;

export function load({ url }) {
	url.searchParams.get('tracked');
	return {
		count: count++
	};
}
