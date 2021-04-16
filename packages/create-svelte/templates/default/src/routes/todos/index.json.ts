import * as db from '$lib/db';

export const get = async (request) =>
	db.read({
		userid: request.context.userid
	});

export const post = async (request) => {
	const { status, body } = await db.create({
		text: request.body.get('text'),
		userid: request.context.userid
	});

	// redirect successful <form> submissions back to /todos
	if (status === 201 && request.headers.accept !== 'application/json') {
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
