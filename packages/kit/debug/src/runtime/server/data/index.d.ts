/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {import('../../../types/internal.d.ts').SSRRoute} route
 * @param {import('../../../types/internal.d.ts').SSROptions} options
 * @param {import('@sveltejs/kit').SSRManifest} manifest
 * @param {import('../../../types/internal.d.ts').SSRState} state
 * @param {boolean[] | undefined} invalidated_data_nodes
 * @param {import('../../../types/internal.d.ts').TrailingSlash} trailing_slash
 * @returns {Promise<Response>}
 */
export function render_data(event: import('@sveltejs/kit').RequestEvent, route: import('../../../types/internal.d.ts').SSRRoute, options: import('../../../types/internal.d.ts').SSROptions, manifest: import('@sveltejs/kit').SSRManifest, state: import('../../../types/internal.d.ts').SSRState, invalidated_data_nodes: boolean[] | undefined, trailing_slash: import('../../../types/internal.d.ts').TrailingSlash): Promise<Response>;
/**
 * @param {Redirect} redirect
 */
export function redirect_json_response(redirect: Redirect): Response;
/**
 * If the serialized data contains promises, `chunks` will be an
 * async iterable containing their resolutions
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {import('../../../types/internal.d.ts').SSROptions} options
 * @param {Array<import('../../../types/internal.d.ts').ServerDataSkippedNode | import('../../../types/internal.d.ts').ServerDataNode | import('../../../types/internal.d.ts').ServerErrorNode | null | undefined>} nodes
 *  @returns {{ data: string, chunks: AsyncIterable<string> | null }}
 */
export function get_data_json(event: import('@sveltejs/kit').RequestEvent, options: import('../../../types/internal.d.ts').SSROptions, nodes: Array<import('../../../types/internal.d.ts').ServerDataSkippedNode | import('../../../types/internal.d.ts').ServerDataNode | import('../../../types/internal.d.ts').ServerErrorNode | null | undefined>): {
    data: string;
    chunks: AsyncIterable<string> | null;
};
import { Redirect } from '../../control.js';
//# sourceMappingURL=index.d.ts.map