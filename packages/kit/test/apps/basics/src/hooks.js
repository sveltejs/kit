export function getContext() {
	return {
		answer: 42
	};
}

/** @param {any} context */
export function getSession({ context }) {
	return context;
}
