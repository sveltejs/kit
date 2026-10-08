import { goto } from '$app/navigation';

export { PUBLIC_DYNAMIC } from '$app/env/public';

/** @param {string} path */
export function go(path) {
	return goto(path);
}
