import { PRIVATE_STATIC } from '$env/static/private';
import { env as dynamic_private } from '$env/dynamic/private';

export function load() {
	return {
		PRIVATE_STATIC,
		PRIVATE_DYNAMIC: dynamic_private.PRIVATE_DYNAMIC
	};
}
