import { error, json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ cookies }) => {
	cookies.delete('auth_session', { path: '/' });
	return json({ status: 'signedOut' });
};
