let count = 0;

export function load({ url: { searchParams } }) {
	searchParams.get('test');
	return {
		count: count++
	};
}
