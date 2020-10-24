export function get(req, res) {
	res.setHeader('Content-Type', 'application/json');

	res.end(JSON.stringify({ user: req.session.user || null }));
}