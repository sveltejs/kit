import { secret } from '$lib/secret.server.js';

// This valid server-side import exercises the "shared" import scenario:
// the module is imported by both client and server code, so the guard's
// import graph has multiple branches to search.
export function load() {
	return { server_value: secret };
}
