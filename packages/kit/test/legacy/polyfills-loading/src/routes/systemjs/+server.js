import systemJSCode from 'systemjs/dist/system.js?raw';

/** @type {import('./$types').RequestHandler} */
export const GET = () =>
	new Response(systemJSCode, {
		status: 200,
		headers: {
			'Content-type': 'application/javascript'
		}
	});
