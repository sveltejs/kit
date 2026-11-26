/** @import { NavigationEvent } from '@sveltejs/kit' */
import * as e from '../../messages/client-errors.js';
import { HttpError, SvelteKitError } from './shared.js';

/**
 * Everything the client remote-function runtime needs from the app it runs in.
 * `start()` installs the app's own router and transport. Code that renders
 * components without a SvelteKit app (such as a component test or a Storybook
 * story) can provide its own with `set_remote_env`.
 * @typedef {{
 *   fetch: (input: string, init?: RequestInit) => Promise<Response>;
 *   decoders: Record<string, (data: any) => any>;
 *   encoders: Record<string, (data: any) => any>;
 *   page: { readonly url: Pick<URL, 'pathname' | 'search'> };
 *   navigating: { readonly to: { readonly url: Pick<URL, 'pathname' | 'search'> } | null } | null;
 *   goto: (url: string | URL, options?: { refreshAll?: boolean }) => Promise<void>;
 *   refresh_all: () => Promise<void>;
 *   handle_error: (error: unknown, event: NavigationEvent) => Promise<App.Error>;
 *   notify_version: (version: string | null) => void;
 * }} RemoteEnv
 */

/**
 * `page` and `goto` need an app, so they throw until `start()` or `set_remote_env`
 * provides them. The other defaults work without an app
 * @type {RemoteEnv}
 */
export const remote_env = {
	fetch: (input, init) => fetch(input, init),
	decoders: {},
	encoders: {},
	page: {
		get url() {
			return e.remote_env_missing({ name: 'page' });
		}
	},
	navigating: null,
	goto: () => e.remote_env_missing({ name: 'goto' }),
	refresh_all: () => refresh_remote_queries(),
	handle_error: (error) => Promise.resolve(default_error(error)),
	notify_version: () => {}
};

/**
 * What `handle_error` returns in an app without a `handleError` hook
 * @param {unknown} error
 * @returns {App.Error}
 */
function default_error(error) {
	if (error instanceof HttpError) return error.body;
	if (error instanceof SvelteKitError) return { status: error.status, message: error.text };

	console.error(error);
	return { status: 500, message: 'Internal Error' };
}

/**
 * @param {Partial<RemoteEnv>} env
 */
export function set_remote_env(env) {
	Object.assign(remote_env, env);
}

/** @type {Set<() => Promise<void>>} */
const refreshers = new Set();

/**
 * Registers a callback that refreshes the queries of one kind (`query`, `query.live`)
 * when `refresh_remote_queries` is called. Call it once per module
 * @param {() => Promise<void>} callback
 */
export function on_remote_refresh(callback) {
	refreshers.add(callback);
}

/**
 * Refreshes every remote query and reconnects every live query on the page, as
 * `refreshAll()` does, but without rerunning `load` functions. It is the default
 * `refresh_all` before `start()`
 * @returns {Promise<void>}
 */
export async function refresh_remote_queries() {
	await Promise.all(Array.from(refreshers, (refresh) => refresh()));
}

/** @type {Set<() => void | Promise<void>>} */
const resetters = new Set();

/**
 * Counts the calls of `reset_remote_state`. An operation reads it when it starts and
 * skips its effects on shared state if a reset happened while it was in flight
 */
export let reset_generation = 0;

/**
 * Registers a callback that clears module-level remote-function state
 * when `reset_remote_state` is called. Call it once per module, not per instance
 * @param {() => void | Promise<void>} callback
 */
export function on_remote_reset(callback) {
	resetters.add(callback);
}

/**
 * Clears every cached query, live query and prerender result and the state of
 * every form, so that the next component starts from scratch. For code that
 * renders many components in one page, such as a test runner
 * @returns {Promise<void>}
 */
export async function reset_remote_state() {
	reset_generation++;
	await Promise.all(Array.from(resetters, (reset) => Promise.resolve(reset())));
}
