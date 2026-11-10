import { Server } from '@sveltejs/kit';

/**
 * SvelteKit's server during `vite dev`, for code that renders requests in a Vite environment
 * outside the Vite process, such as an adapter's Worker in workerd. It has the same API as the
 * [server](https://svelte.dev/docs/kit/@sveltejs-kit#Server) that `builder.generateServerInstance`
 * writes for production. See [`respond`](https://svelte.dev/docs/kit/@sveltejs-kit#AdapterViteConfig).
 *
 * ```js
 * import { server } from '@sveltejs/kit/adapter/dev';
 *
 * await server.init({ env });
 * const response = await server.respond(request, { getClientAddress: () => address });
 * ```
 * @since 3.3.0
 */
export const server: Server;
