export function get_origin() {
	return window.location.origin;
}

export * from './shared.js';
export { refresh_remote_queries, reset_remote_state, set_remote_env } from './remote-env.js';
