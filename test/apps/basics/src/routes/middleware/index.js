export function get(req, res, next) {
	if (req.headers.accept === 'application/json') {
		return { body: { json: true } };
	}

	next();
}
