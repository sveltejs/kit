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
		return a.getTime() === b.getTime();
	}

	try {
		return JSON.stringify(a) === JSON.stringify(b);
	} catch {
		// This means they cannot be JSON-ified. This is annoying.
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

	if (a instanceof Map) {
		return a.size === b.size && a.every((value, key) => deep_equal(value, b.get(key)));
	}

	if (a instanceof Set) {
		return a.size === b.size && a.every((value) => b.has(value));
	}

	if (binary_constructors.includes(a.constructor)) {
		return a.length === b.length && a.every((value, index) => value === b[index]);
	}

	return Object.values(a).every((value, index) => deep_equal(value, b[index]));
}
