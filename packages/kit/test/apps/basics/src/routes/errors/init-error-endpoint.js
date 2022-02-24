// @ts-expect-error
thisvariableisnotdefined; // eslint-disable-line

export function get() {
	return {
		body: {
			answer: 42
		}
	};
}
