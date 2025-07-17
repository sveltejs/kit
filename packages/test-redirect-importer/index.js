import { redirect } from '@sveltejs/kit';

// This exists to check that an external package importing `redirect`
// will get something that satisfies the relevant `instanceof` checks

/**
 * @param {string} redirectUrl
 * @returns {never}
 */
export function authenticate(redirectUrl) {
	redirect(302, redirectUrl);
}
