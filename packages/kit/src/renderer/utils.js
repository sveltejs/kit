export function normalize_headers(headers) {
	const normalized = {};
	for (const key in headers) {
		normalized[key.toLowerCase()] = headers[key];
	}
	return normalized;
}
