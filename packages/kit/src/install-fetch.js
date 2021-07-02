import fetch, { Response, Request, Headers } from 'node-fetch';

Object.defineProperties(globalThis, {
	fetch: {
		enumerable: true,
		value: fetch
	},
	Response: {
		enumerable: true,
		value: Response
	},
	Request: {
		enumerable: true,
		value: Request
	},
	Headers: {
		enumerable: true,
		value: Headers
	}
});
