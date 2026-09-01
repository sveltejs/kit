/** @import { Context } from '@netlify/types' */

/**
 * @param {Request} request
 * @param {Context} context
 * @param {string} path
 */
export function set_skew_cookie(request, context, path) {
	const token = context.deploy.skewProtectionToken;
	if (!token || request.headers.get('sec-fetch-dest') !== 'document') return;

	context.cookies.set({
		name: '__sveltekit_skew',
		value: token,
		path,
		sameSite: 'Strict',
		secure: true,
		httpOnly: true
	});
}
