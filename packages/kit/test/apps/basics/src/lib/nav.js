import { goto } from '$app/navigation';

/** @param {string} path */
export function go(path) {
	return goto(path);
}
