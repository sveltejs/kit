function redirectResponse() {
	const urlSearchParams = new URLSearchParams({ 'redirect': 'https://kit.svelte.dev/docs' })

	const redirectTo = `https://my.server.com/?${urlSearchParams.toString()}`

	return {
		status: 302,
		headers: {
			location: redirectTo
		}
	}
}

export class App {
	render({ url }) {
		if (url === 'http://prerender/redirect-url-encoding') return redirectResponse()

		return {
			status: 200,
			headers: {
				'content-type': 'text/html'
			},
			body: ''
		};
	}
}

export function override() { }
