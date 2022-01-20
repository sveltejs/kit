export class App {
	render() {
		return new Response('', {
			status: 200,
			headers: {
				'content-type': 'text/html'
			}
		});
	}
}

export function override() {}
