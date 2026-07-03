import { command, getRequestEvent, query } from '$app/server';
import { redirect } from '@sveltejs/kit';

const sessions = new Map();

/** @typedef {{ authenticated: boolean }} SessionState */

/** @returns {SessionState} */
function session() {
	const id = getRequestEvent().cookies.get('count_session') ?? 'default';
	let state = sessions.get(id);
	if (!state) {
		state = { authenticated: false };
		sessions.set(id, state);
	}
	return state;
}

export const protected_query = query(() => {
	const path = getRequestEvent().url.pathname;
	if (path === '/remote/query-redirect-cached/protected' && !session().authenticated) {
		redirect(307, '/remote/query-redirect-cached/redirected');
	}

	return session().authenticated ? 'authenticated' : 'unauthenticated';
});

export const login = command(() => {
	session().authenticated = true;
});

export const logout = command(() => {
	session().authenticated = false;
});
