/** @type {import('amphtml-validator').Validator} */
const amp = await (await import('amphtml-validator')).getInstance();

/** @type {import('types/hooks').Handle} */
export async function handle({ event, resolve }) {
	const response = await resolve(event);
	if (response.headers.get('content-type') !== 'text/html') {
		return response;
	}

	let rendered = await response.text();
	const result = amp.validateString(rendered);

	if (result.status !== 'PASS') {
		const lines = rendered.split('\n');

		/** @param {string} str */
		const escape = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

		rendered = `<!doctype html>
		<head>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<style>
				body {
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
					color: #333;
				}

				pre {
					background: #f4f4f4;
					padding: 1em;
					overflow-x: auto;
				}
			</style>
		</head>
		<h1>AMP validation failed</h1>

		${result.errors
			.map(
				(error) => `
			<h2>${error.severity}</h2>
			<p>Line ${error.line}, column ${error.col}: ${error.message} (<a href="${error.specUrl}">${
					error.code
				}</a>)</p>
			<pre>${escape(lines[error.line - 1])}</pre>
		`
			)
			.join('\n\n')}
	`;
	}

	return new Response(rendered, { status: response.status, headers: response.headers });
}
