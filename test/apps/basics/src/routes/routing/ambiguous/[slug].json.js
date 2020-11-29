export function get(req, res) {
	return { body: req.params.slug };
}
