import { URL } from 'url';
// eslint-disable-next-line import/no-unresolved
import { get_body } from '@sveltejs/kit/http';

export async function handler(event) {
	const req = event.Records[0].cf.request;

	const { pathname, searchParams } = new URL(req.url || '', 'http://localhost');

	const { render } = await import('./server/app.mjs');

	//Render
	const rendered = await render({
		method: req.method,
		headers: req.headers,
		path: pathname,
		query: searchParams,
		body: await get_body(req)
	});

	//Response
	if (rendered) {
		const { status, headers, statusText, body } = rendered;

		console.log('PRINT OUT HEADER -- Before');
		console.log(headers);

		/* Bake CloudFront headers in to requested format:
		
		headers: {
        	'header name in lowercase': [{
            key: 'header name in standard case',
            value: 'header value'
        	}]
		}
		
		*/
		const cf_headers = new Object();

		Object.keys(headers).forEach((key) => {
			const lowercase_key = key.toLowerCase();
			const value = headers[key];
			//Append CloudFront baked key
			cf_headers[lowercase_key] = [{ key, value }];
		});

		const res = {
			body,
			statusDescription: statusText,
			bodyEncoding: 'text',
			headers: cf_headers,
			status
		};
		return res;
	}
}
