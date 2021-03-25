import * as api from '$lib/api.js';

export async function get({ params, context }) {
	const { slug } = params;
	const { comments } = await api.get(
		`articles/${slug}/comments`,
		context.user && context.user.token
	);

	return {
		body: comments
	};
}

export async function post({ params, body: form, headers, context }) {
	if (!context.user) {
		return { status: 401 };
	}

	const { slug } = params;
	const body = form.get('comment');

	const { comment } = await api.post(
		`articles/${slug}/comments`,
		{ comment: { body } },
		context.user.token
	);

	// for AJAX requests, return the newly created comment
	if (headers.accept === 'application/json') {
		return {
			status: 201, // created
			body: comment
		};
	}

	// for traditional (no-JS) form submissions, redirect
	// back to the article page
	console.log(`redirecting to /article/${slug}`);
	return {
		status: 303, // see other
		headers: {
			location: `/article/${slug}`
		}
	};
}
