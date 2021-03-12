import * as api from '$lib/api.js';

export function post(req, res) {
	const user = req.body;

	api.put('user', { user }, req.session.user && req.session.user.token).then((response) => {
		if (response.user) {
			req.session.user = response.user;
		}

		res.setHeader('Content-Type', 'application/json');

		res.end(JSON.stringify(response));
	});
}
