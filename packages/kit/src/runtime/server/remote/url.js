import { app_dir, base } from '$app/paths/internal/server';

/**
 * Extracts the remote function id from a request URL, or returns `undefined` if
 * the URL does not target a remote function.
 * @param {URL} url
 * @returns {string | undefined}
 */
export function get_remote_id(url) {
	const prefix = `${base}/${app_dir}/remote/`;
	if (!url.pathname.startsWith(prefix)) return undefined;
	return url.pathname.replace(prefix, '');
}

/**
 * Extracts the remote form action id from a request URL.
 * @param {URL} url
 * @returns {string | null}
 */
export function get_remote_action(url) {
	return url.searchParams.get('/remote');
}
