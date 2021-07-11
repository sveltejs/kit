/**
 * Decides how the body should be parsed based on its mime type.
 *
 * This is intended to be used with both requests and responses, to have a consistent body parsing across adapters.
 *
 * @param {string} content_type The `content-type` header of a request/response.
 * @returns {boolean}
 */
export function isContentTypeBinary(content_type) {
	return (
		content_type.startsWith('image') ||
		content_type.startsWith('audio') ||
		content_type.startsWith('video') ||
		content_type.startsWith('application/octet-stream')
	);
}
