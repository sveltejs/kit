let count = 0;

export function load({ url }) {
	url.searchParams.get('a');
	return {
		count: count++
	};
}
