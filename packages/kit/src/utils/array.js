/**
 * @function
 * @template T
 * @param {Array<T>} arr
 * @returns {Array<NonNullable<T>>}
 */
export function compact(arr) {
	return arr.filter(/** @returns {val is NonNullable<T>} */ (val) => val != null);
}
