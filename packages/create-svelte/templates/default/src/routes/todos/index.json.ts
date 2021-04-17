import type { RequestHandler } from '@sveltejs/kit';

export const get: RequestHandler = async (request) => {
	const res = await fetch(`http://localhost:8787/todos/${request.context.userid}`);

	if (res.ok) {
		return {
			status: res.status,
			body: await res.json()
		};
	}

	return {
		status: res.status,
		body: res.ok ? await res.json() : await res.text()
	};
};

export const post: RequestHandler = async (request) => {
	const res = await fetch(`http://localhost:8787/todos/${request.context.userid}`);

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
		body: res.ok ? await res.json() : await res.text()
	};
};
