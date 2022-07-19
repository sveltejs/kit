export async function is_even(num) {
	const { is_odd } = await import('./_is_odd.js');
	if (num === 0) return true;
	return is_odd(num - 1);
}
