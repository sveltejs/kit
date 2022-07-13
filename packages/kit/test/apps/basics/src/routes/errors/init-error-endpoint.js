// @ts-expect-error
thisvariableisnotdefined; // eslint-disable-line

export function GET() {
	return {
		body: {
			answer: 42
		}
	};
}
