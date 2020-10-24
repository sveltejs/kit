import * as api from '$common/api.js';

export function post(req, res) {
	const user = req.body;

	api.post('users', { user }).then(response => {
		if (response.user) {
			req.session.user = response.user;
		}

		res.setHeader('Content-Type', 'application/json');

		res.end(JSON.stringify(response));
	});
}