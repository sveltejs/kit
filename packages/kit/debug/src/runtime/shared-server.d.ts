export function set_private_env(environment: Record<string, string>): void;
export function set_public_env(environment: Record<string, string>): void;
export function set_safe_public_env(environment: Record<string, string>): void;
/** @param {(error: Error) => string} value */
export function set_fix_stack_trace(value: (error: Error) => string): void;
/**
 * `$env/dynamic/private`
 * @type {Record<string, string>}
 */
export let private_env: Record<string, string>;
/**
 * `$env/dynamic/public`. When prerendering, this will be a proxy that forbids reads
 * @type {Record<string, string>}
 */
export let public_env: Record<string, string>;
/**
 * The same as `public_env`, but without the proxy. Use for `%sveltekit.env.PUBLIC_FOO%`
 * @type {Record<string, string>}
 */
export let safe_public_env: Record<string, string>;
export function fix_stack_trace(error: any): any;
//# sourceMappingURL=shared-server.d.ts.map