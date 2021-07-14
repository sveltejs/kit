/**
 * Decides how the body should be parsed based on its mime type. Should match what's in parse_body
 *
 * This is intended to be used with both requests and responses, to have a consistent body parsing across adapters.
 *
 * @param {string?} content_type The `content-type` header of a request/response.
 * @returns {boolean}
 */
export function isContentTypeTextual(content_type) {
	if (!content_type) return true; // defaults to json
	const [type] = content_type.split(';'); // get the mime type
	return (
		type === 'text/plain' ||
		type === 'application/json' ||
		type === 'application/x-www-form-urlencoded' ||
		type === 'multipart/form-data'
	);
}
