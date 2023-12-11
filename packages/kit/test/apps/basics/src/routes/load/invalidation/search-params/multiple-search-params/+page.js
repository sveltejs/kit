let count = 0;

export function load({ url: { searchParams } }) {
	searchParams.getAll('test');
	return {
		count: count++
	};
}
