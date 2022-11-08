export async function is_odd(num) {
	const { is_even } = await import('./_is_even.js');
	if (num === 1) return true;
	return is_even(num - 1);
}
