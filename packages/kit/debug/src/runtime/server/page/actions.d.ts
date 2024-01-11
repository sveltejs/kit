/** @param {import('@sveltejs/kit').RequestEvent} event */
export function is_action_json_request(event: import('@sveltejs/kit').RequestEvent): boolean;
/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {import('../../../types/internal.d.ts').SSROptions} options
 * @param {import('../../../types/internal.d.ts').SSRNode['server'] | undefined} server
 */
export function handle_action_json_request(event: import('@sveltejs/kit').RequestEvent, options: import('../../../types/internal.d.ts').SSROptions, server: import('../../../types/internal.d.ts').SSRNode['server'] | undefined): Promise<Response>;
/**
 * @param {import('@sveltejs/kit').Redirect} redirect
 */
export function action_json_redirect(redirect: import('@sveltejs/kit').Redirect): Response;
/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export function is_action_request(event: import('@sveltejs/kit').RequestEvent): boolean;
/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {import('../../../types/internal.d.ts').SSRNode['server'] | undefined} server
 * @returns {Promise<import('@sveltejs/kit').ActionResult>}
 */
export function handle_action_request(event: import('@sveltejs/kit').RequestEvent, server: import('../../../types/internal.d.ts').SSRNode['server'] | undefined): Promise<import('@sveltejs/kit').ActionResult>;
/**
 * Try to `devalue.uneval` the data object, and if it fails, return a proper Error with context
 * @param {any} data
 * @param {string} route_id
 */
export function uneval_action_response(data: any, route_id: string): string;
//# sourceMappingURL=actions.d.ts.map