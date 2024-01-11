/** @param {any} body */
export function is_pojo(body: any): boolean;
/**
 * @param {Partial<Record<import('../../types/internal.d.ts').HttpMethod, any>>} mod
 * @param {import('../../types/internal.d.ts').HttpMethod} method
 */
export function method_not_allowed(mod: Partial<Record<import('../../types/internal.d.ts').HttpMethod, any>>, method: import('../../types/internal.d.ts').HttpMethod): Response;
/** @param {Partial<Record<import('../../types/internal.d.ts').HttpMethod, any>>} mod */
export function allowed_methods(mod: Partial<Record<import('../../types/internal.d.ts').HttpMethod, any>>): string[];
/**
 * Return as a response that renders the error.html
 *
 * @param {import('../../types/internal.d.ts').SSROptions} options
 * @param {number} status
 * @param {string} message
 */
export function static_error_page(options: import('../../types/internal.d.ts').SSROptions, status: number, message: string): Response;
/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {import('../../types/internal.d.ts').SSROptions} options
 * @param {unknown} error
 */
export function handle_fatal_error(event: import('@sveltejs/kit').RequestEvent, options: import('../../types/internal.d.ts').SSROptions, error: unknown): Promise<Response>;
/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {import('../../types/internal.d.ts').SSROptions} options
 * @param {any} error
 * @returns {Promise<App.Error>}
 */
export function handle_error_and_jsonify(event: import('@sveltejs/kit').RequestEvent, options: import('../../types/internal.d.ts').SSROptions, error: any): Promise<App.Error>;
/**
 * @param {number} status
 * @param {string} location
 */
export function redirect_response(status: number, location: string): Response;
/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {Error & { path: string }} error
 */
export function clarify_devalue_error(event: import('@sveltejs/kit').RequestEvent, error: Error & {
    path: string;
}): string;
/**
 * @param {import('../../types/internal.d.ts').ServerDataNode} node
 */
export function stringify_uses(node: import('../../types/internal.d.ts').ServerDataNode): string;
/**
 * @param {string} message
 * @param {number} offset
 */
export function warn_with_callsite(message: string, offset?: number): void;
//# sourceMappingURL=utils.d.ts.map