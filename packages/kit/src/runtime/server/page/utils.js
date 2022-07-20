/**
 * @param {any} v
 */
export function is_pojo(v) {
	// This simple check might potentially run into some weird edge cases
	// Refer to https://github.com/lodash/lodash/blob/2da024c3b4f9947a48517639de7560457cd4ec6c/isPlainObject.js?rgh-link-date=2022-07-20T12%3A48%3A07Z#L30
	// if that ever happens
	return Object.getPrototypeOf(v) === Object.prototype;
}

/**
 * @param {any} v
 */
export function is_serializable_primitive(v) {
	return (
		v == null ||
		typeof v === 'boolean' ||
		typeof v === 'string' ||
		(typeof v === 'number' && !isNaN(v) && isFinite(v)) // NaN or Infinity turns into null when stringified
	);
}

/**
 * Recursively checks if a value can survive JSON serialization and logs a warning if not.
 * @param {any} v
 * @param {(string | number)[]} path
 */
export function warn_if_not_json_safe(v, path = []) {
	if (is_serializable_primitive(v)) return;

	if (is_pojo(v)) {
		Object.entries(v).forEach(([k, v]) => warn_if_not_json_safe(v, [...path, k]));
	} else if (Array.isArray(v)) {
		v.forEach((v, i) => warn_if_not_json_safe(v, [...path, i]));
	} else {
		console.warn(
			`${path.join('.')}:`,
			v,
			`cannot be serialized and deserialized safely. You may get an unexpected value.`
		);
	}
}
