/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {import('../../types/internal.d.ts').SSREndpoint} mod
 * @param {import('../../types/internal.d.ts').SSRState} state
 * @returns {Promise<Response>}
 */
export function render_endpoint(event: import('@sveltejs/kit').RequestEvent, mod: import('../../types/internal.d.ts').SSREndpoint, state: import('../../types/internal.d.ts').SSRState): Promise<Response>;
/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export function is_endpoint_request(event: import('@sveltejs/kit').RequestEvent): boolean;
//# sourceMappingURL=endpoint.d.ts.map