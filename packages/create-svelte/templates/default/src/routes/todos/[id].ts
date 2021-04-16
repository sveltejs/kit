import * as db from '$lib/db';

export const patch = async (request) => {
	const { status, body } = await db.update({
		userid: request.context.userid,
		id: request.params.id,
		text: request.body.get('text'),
		done: request.body.has('done') ? !!request.body.get('done') : undefined
	});

	// redirect successful <form> submissions back to /todos
	if (status === 200 && request.headers.accept !== 'application/json') {
		return {
			status: 303,
			headers: {
				location: '/todos'
			},
			body: '' // TODO https://github.com/sveltejs/kit/issues/1047
		};
	}

	return { status, body };
};

export const del = async (request) => {
	const { status, body } = await db.del({
		userid: request.context.userid,
		id: request.params.id
	});

	// redirect successful <form> submissions back to /todos
	if (status === 204 && request.headers.accept !== 'application/json') {
		return {
			status: 303,
			headers: {
				location: '/todos'
			},
			body: '' // TODO https://github.com/sveltejs/kit/issues/1047
		};
	}

	return { status, body };
};
