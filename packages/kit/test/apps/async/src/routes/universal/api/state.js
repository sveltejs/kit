import { per_session } from '../../remote/per-session.js';

/**
 * A fake external API that the universal functions talk to via `fetch`.
 * State is isolated per test via the `session` cookie.
 */
export const get_state = per_session(() => ({
	count: 0,
	todos: ['first todo']
}));
