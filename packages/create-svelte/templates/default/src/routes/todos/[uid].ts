export const patch = async (request) => {
	if (!request.context.userid) {
		return { status: 401 };
	}

	const res = await fetch(
		`http://localhost:8787/todos/${request.context.userid}/${request.params.uid}`,
		{
			method: 'PATCH',
			body: JSON.stringify({
				text: request.body.get('text'),
				done: request.body.has('done') ? !!request.body.get('done') : undefined
			})
		}
	);

	// redirect successful <form> submissions back to /todos
	if (res.ok && request.headers.accept !== 'application/json') {
		return {
			status: 303,
			headers: {
				location: '/todos'
			},
			body: '' // TODO https://github.com/sveltejs/kit/issues/1047
		};
	}

	return {
		status: res.status,
		body: res.ok ? '' : await res.text()
	};
};

export const del = async (request) => {
	if (!request.context.userid) {
		return { status: 401 };
	}

	const res = await fetch(
		`http://localhost:8787/todos/${request.context.userid}/${request.params.uid}`,
		{
			method: 'DELETE'
		}
	);

	// redirect successful <form> submissions back to /todos
	if (res.ok && request.headers.accept !== 'application/json') {
		return {
			status: 303,
			headers: {
				location: '/todos'
			},
			body: '' // TODO https://github.com/sveltejs/kit/issues/1047
		};
	}

	return {
		status: res.status,
		body: res.ok ? '' : await res.text()
	};
};
