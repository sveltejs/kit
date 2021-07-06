/**
 * @param {import('types/page').LoadOutput} loaded
 * @returns {import('types/internal').NormalizedLoadOutput}
 */
export function normalize(loaded) {
	// TODO should this behaviour be dev-only?

	if (
		loaded.error ||
		(loaded.status && loaded.status >= 400 && loaded.status <= 599 && !loaded.redirect)
	) {
		const status = loaded.status;
		if (!loaded.error) {
			let errorMessage = 'not assigned';
			switch (status) {
				case 400:
					errorMessage = 'Bad Request';
					break;
				case 401:
					errorMessage = 'Unauthorized';
					break;
				case 402:
					errorMessage = 'Payment Required';
					break;
				case 403:
					errorMessage = 'Forbidden';
					break;
				case 404:
					errorMessage = 'Not Found';
					break;
				case 405:
					errorMessage = 'Method not Allowed';
					break;
				case 406:
					errorMessage = 'Not Acceptable';
					break;
				case 407:
					errorMessage = 'Proxy Authentication Required';
					break;
				case 408:
					errorMessage = 'Request Timeout';
					break;
				case 409:
					errorMessage = 'Conflict';
					break;
				case 410:
					errorMessage = 'Gone';
					break;
				case 411:
					errorMessage = 'Length Required';
					break;
				case 412:
					errorMessage = 'Precondition Failed';
					break;
				case 413:
					errorMessage = 'Request Entity Too Large';
					break;
				case 414:
					errorMessage = 'Request-URI Too Long';
					break;
				case 415:
					errorMessage = 'Unsupported Media Type';
					break;
				case 416:
					errorMessage = 'Requested Range Not Satisfiable';
					break;
				case 417:
					errorMessage = 'Expectation Failed';
					break;
				case 418:
					errorMessage = "I'm a teapot";
					break;
				case 422:
					errorMessage = 'Unprocessable Entity';
					break;
				case 423:
					errorMessage = 'Locked';
					break;
				case 424:
					errorMessage = 'Failed Dependency';
					break;
				case 426:
					errorMessage = 'Upgrade Required';
					break;
				case 428:
					errorMessage = 'Precondition Required';
					break;
				case 429:
					errorMessage = 'Too Many Requests';
					break;
				case 431:
					errorMessage = 'Request Header Fields Too Large';
					break;
				case 444:
					errorMessage = 'No Response';
					break;
				case 449:
					errorMessage = 'Retry With';
					break;
				case 451:
					errorMessage = 'Unavailable For Legal Reasons';
					break;
				case 499:
					errorMessage = 'Client Closed Request';
					break;
				case 500:
					errorMessage = 'Internal Sever Error';
					break;
				case 501:
					errorMessage = 'Not Implemented';
					break;
				case 502:
					errorMessage = 'Bad Gateway';
					break;
				case 503:
					errorMessage = 'Service Unavailable';
					break;
				case 504:
					errorMessage = 'Gateway Timeout';
					break;
				case 505:
					errorMessage = 'HTTP Version Not Supported';
					break;
				case 506:
					errorMessage = 'Variant Also Negotiates';
					break;
				case 507:
					errorMessage = 'Insufficient Storage';
					break;
				case 508:
					errorMessage = 'Loop Detected';
					break;
				case 509:
					errorMessage = 'Bandwidth Limit Exceeded';
					break;
				case 510:
					errorMessage = 'Not Extended';
					break;
				case 511:
					errorMessage = 'Network Authentication Required';
					break;
				case 598:
					errorMessage = 'Network Read Timeout Error';
					break;
				case 599:
					errorMessage = 'Network Connect Timeout Error';
					break;
			}

			const statusRecognized = errorMessage !== 'not assigned';
			return {
				status: statusRecognized ? status : 500,
				error: new Error(statusRecognized ? errorMessage : 'Internal Server Error')
			};
		}

		const error = typeof loaded.error === 'string' ? new Error(loaded.error) : loaded.error;

		if (!(error instanceof Error)) {
			return {
				status: 500,
				error: new Error(
					`"error" property returned from load() must be a string or instance of Error, received type "${typeof error}"`
				)
			};
		}

		if (!status || status < 400 || status > 599) {
			console.warn('"error" returned from load() without a valid status code — defaulting to 500');
			return { status: 500, error };
		}

		return { status, error };
	}

	if (loaded.redirect) {
		if (!loaded.status || Math.floor(loaded.status / 100) !== 3) {
			return {
				status: 500,
				error: new Error(
					'"redirect" property returned from load() must be accompanied by a 3xx status code'
				)
			};
		}

		if (typeof loaded.redirect !== 'string') {
			return {
				status: 500,
				error: new Error('"redirect" property returned from load() must be a string')
			};
		}
	}

	return /** @type {import('types/internal').NormalizedLoadOutput} */ (loaded);
}
