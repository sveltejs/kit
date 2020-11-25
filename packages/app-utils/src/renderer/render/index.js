 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { createHash } from 'crypto';
import render_page from './page';
import render_endpoint from './endpoint';


function md5(body) {
	return createHash('md5').update(body).digest('hex');
}

export async function render(
	request,
	options
) {
	const { context, headers = {} } = (await _optionalChain([options, 'access', _ => _.setup, 'access', _2 => _2.prepare, 'optionalCall', _3 => _3(request.headers)])) || {};

	try {
		const response = await (render_endpoint(request, context, options) ||
			render_page(request, context, options));

		if (response) {
			// inject ETags for 200 responses
			if (response.status === 200) {
				if (!/(no-store|immutable)/.test(response.headers['cache-control'])) {
					const etag = `"${md5(response.body)}"`;

					if (request.headers['if-none-match'] === etag) {
						return {
							status: 304,
							headers: {},
							body: null
						};
					}

					response.headers['etag'] = etag;
				}
			}

			return {
				status: response.status,
				headers: { ...headers, ...response.headers },
				body: response.body
			};
		}
	} catch (err) {
		return {
			status: 500,
			headers: {},
			body: options.dev ? err.stack : err.message
		};
	}
}
