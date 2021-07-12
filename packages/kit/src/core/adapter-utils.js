/**
 * Decides how the body should be parsed based on its mime type. Should match what's in parse_body
 *
 * This is intended to be used with both requests and responses, to have a consistent body parsing across adapters.
 *
 * @param {string} content_type The `content-type` header of a request/response.
 * @returns {boolean}
 */
export function isContentTypeTextual(content_type) {
	return (
		!content_type || // defaults to json
		content_type === 'text/plain' ||
		content_type === 'application/json' ||
		content_type === 'application/x-www-form-urlencoded' ||
		content_type === 'multipart/form-data'
	);
}
