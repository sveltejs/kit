export function prepare() {
	return {
		context: {
			answer: 42
		}
	};
}

/** @param {any} context */
export function getSession({ context }) {
	return context;
}
