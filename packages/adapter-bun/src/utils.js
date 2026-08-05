/**
 * @param {string} value
 * @returns {number}
 */
export function parse_as_bytes(value) {
	const multiplier =
		{
			K: 1024,
			M: 1024 * 1024,
			G: 1024 * 1024 * 1024
		}[value[value.length - 1]?.toUpperCase()] ?? 1;

	return Number(multiplier === 1 ? value : value.slice(0, -1)) * multiplier;
}
