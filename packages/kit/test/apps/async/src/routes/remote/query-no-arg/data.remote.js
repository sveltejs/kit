import { query } from '$app/server';

// a no-argument query: the client sends no `payload` search param, so the
// server must normalize the missing param to `''` (the canonical empty
// payload) to match the cache key the client is listening on.
export const get_no_arg = query(() => 'no-arg value');
