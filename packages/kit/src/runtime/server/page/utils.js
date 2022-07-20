/**
 * @param {any} v
 */
export function is_pojo(v) {
	// TODO: javascript-isms
	return Object.getPrototypeOf(v) === Object.prototype;
}

/** @param {any} v */
export function is_serializable_primitive(v) {
	// TODO: javascript-isms
	return (
		v == null ||
		typeof v === 'boolean' ||
		typeof v === 'string' ||
		(typeof v === 'number' && !isNaN(v)) // JSON.stringify(NaN) === null
	);
}

/**
 * Recursively checks if a value can survive JSON serialization and logs a warning if not.
 * @param {any} v
 * @param {(string | number)[]} path
 */
export function warn_if_not_serdeable(v, path = []) {
	if (is_serializable_primitive(v)) return;

	if (is_pojo(v)) {
		Object.entries(v).forEach(([k, v]) => warn_if_not_serdeable(v, [...path, k]));
	} else if (Array.isArray(v)) {
		v.forEach((v, i) => warn_if_not_serdeable(v, [...path, i]));
	} else {
		console.warn(
			`${path.join(
				'.'
			)}: ${v} cannot be serialized and deserialized safely. You may get an unexpected value.`
		);
	}
}
