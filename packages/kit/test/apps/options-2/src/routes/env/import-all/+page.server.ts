import * as env from '$app/env/private';

export function load() {
	return {
		// we need to do this dance to strip out Symbol keys in Node 18, apparently?
		env: Object.fromEntries(Object.entries(env))
	};
}
