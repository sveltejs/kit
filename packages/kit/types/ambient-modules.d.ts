declare module '@sveltejs/kit/hooks' {
	type Handle = import('@sveltejs/kit').Handle;

	/**
	 * Utility function that allows chaining `handle` functions in a
	 * middleware-like manner.
	 *
	 * @param handlers The chain of `handle` functions
	 */
	export function sequence(...handlers: Handle[]): Handle;
}

declare module '@sveltejs/kit/node' {
	type IncomingMessage = import('http').IncomingMessage;
	type RawBody = import('types/helper').RawBody;

	export interface GetRawBody {
		(request: IncomingMessage): Promise<RawBody>;
	}
	export const getRawBody: GetRawBody;
}

declare module '@sveltejs/kit/ssr' {
	type IncomingRequest = import('@sveltejs/kit').IncomingRequest;
	type Options = import('types/internal').SSRRenderOptions;
	type State = import('types/internal').SSRRenderState;
	type ServerResponse = import('@sveltejs/kit').Response;

	export interface Respond {
		(incoming: IncomingRequest, options: Options, state?: State): ServerResponse;
	}
	export const respond: Respond;
}

declare module '@sveltejs/kit/install-fetch' {
	type Fetch = import('node-fetch');
	type Headers = import('node-fetch').Headers;
	type Request = import('node-fetch').Request;
	type Response = import('node-fetch').Response;

	const fetch: Fetch;
	export { fetch, Headers, Request, Response };
}
