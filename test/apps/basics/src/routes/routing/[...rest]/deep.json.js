export function get(req, res) {
	return { body: req.params.rest.join(',') };
}
