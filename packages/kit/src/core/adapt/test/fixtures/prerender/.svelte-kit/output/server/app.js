export class App {
	render() {
		return {
			status: 200,
			headers: {
				'content-type': 'text/html'
			},
			body: ''
		};
	}
}

export function override() {}
