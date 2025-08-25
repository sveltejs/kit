/**
 * Removes nullish values from an array.
 *
 * @template T
 * @param {Array<T>} arr
 */
export function compact(arr) {
	return arr.filter(/** @returns {val is NonNullable<T>} */ (val) => val != null);
}

/**
 * Joins an array of strings with commas and 'and'.
 * @param {string[]} array
 */
export function conjoin(array) {
	if (array.length <= 2) return array.join(' and ');
	return `${array.slice(0, -1).join(', ')} and ${array.at(-1)}`;
}
