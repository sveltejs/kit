export function middleware() {}

/** @param {Request} request */
export function call_middleware(request) {
	return {
		request,
		did_reroute: false,
		request_headers: new Headers(),
		response_headers: new Headers(),
		add_response_headers: () => {}
	};
}
