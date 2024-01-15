/**
 * Concatenate an array or set with another set.
 *
 * @template T
 * @param {Set<T>} set
 * @param {(Array<T> | Set<T>)[]} args
 */
export function concat(set, ...args) {
	for (let i = 0; i < args.length; i++) {
		const item = args[i];
		if (Array.isArray(item)) {
			// for loop is most performant here
			// see https://stackoverflow.com/a/47220028
			const array_length = item.length;
			for (let j = 0; j < array_length; j++) {
				set.add(item[j]);
			}
		} else {
			set = new Set([...set, ...item]);
		}
	}
	return set;
}
