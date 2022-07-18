// @ts-expect-error
thisvariableisnotdefined;

export function GET() {
	return {
		body: {
			answer: 42
		}
	};
}
