export function del(req, res) {
	return {
		status: 200,
		body: {
			id: req.params.id
		}
	};
}
