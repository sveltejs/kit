// @ts-nocheck: This file is NOT type-safe, be careful.

const binary_constructors = [
	Uint8Array,
	Uint16Array,
	Uint32Array,
	Uint8ClampedArray,
	Float32Array,
	Float64Array
];

/**
 * Internal function to check if two values are deeply equal.
 * @param {*} a - The first value.
 * @param {*} b - The second value.
 * @returns {boolean} - Whether the two values are deeply equal.
 */
export function deep_equal(a, b) {
	if (a === b) {
		// Fast path for identical references
		return true;
	}
	if (typeof a !== typeof b) {
		// Fast path for different types
		return false;
	}
	if (typeof a !== 'object') {
		// Fast path for types that equality alone works for
		return false;
	}

	if (a instanceof Date) {
		// Technically, the JSON check will handle this, but we can make it more accurate
		if (!(b instanceof Date)) return false;
		return a.getTime() === b.getTime();
	}

	if (a instanceof Map) {
		if (!(b instanceof Map)) return false;
		for (const [key, value] of a) {
			if (!b.has(key)) return false;
			if (!deep_equal(value, b.get(key))) return false;
		}
		return a.size === b.size;
	}

	if (a instanceof Set) {
		if (!(b instanceof Set)) return false;
		for (const value of a) {
			if (!b.has(value)) return false;
			if (!deep_equal(value, b.get(value))) return false;
		}
		return a.size === b.size;
	}

	const a_is_array = Array.isArray(a);
	const b_is_array = Array.isArray(b);
	if (a_is_array !== b_is_array) {
		// One is an array, the other is not
		return false;
	}

	if (a_is_array) {
		return a.every((value, index) => deep_equal(value, b[index]));
	}

	if (binary_constructors.includes(a.constructor)) {
		return a.length === b.length && a.every((value, index) => value === b[index]);
	}

	try {
		return JSON.stringify(a) === JSON.stringify(b);
	} catch {
		// This means they cannot be JSON-ified. This is annoying.
	}

	return Object.values(a).every((value, index) => deep_equal(value, b[index]));
}
