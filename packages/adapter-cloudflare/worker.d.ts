/**
 * SvelteKit's request handler. Call it from the `fetch` handler of the Worker that
 * `entrypoint` in `cloudflare.config.ts` points to:
 *
 * ```ts
 * import { fetch } from '@sveltejs/adapter-cloudflare/worker';
 *
 * export default { fetch };
 * ```
 */
export function fetch(request: Request, env: unknown, ctx: unknown): Promise<Response>;
