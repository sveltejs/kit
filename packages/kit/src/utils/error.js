/**
 * @param {unknown} err
 * @return {Error}
 */
export function coalesce_to_error(err) {
	return err instanceof Error ||
		(err && /** @type {any} */ (err).name && /** @type {any} */ (err).message)
		? /** @type {Error} */ (err)
		: new Error(JSON.stringify(err));
}

/**
 * @param {Error} err
 * @param {any} errorCode
 * @return {err is Error & {code: any}}
 */
export function has_error_code(err, errorCode = undefined) {
	return 'code' in err && (errorCode === undefined || /** @type {any} */ (err).code === errorCode);
}
