import { redirect } from '@sveltejs/kit';

/**
 * @param {string} redirectUrl
 * @returns {never}
 */
export function authenticate(redirectUrl) {
	redirect(302, redirectUrl);
}
