export function getContext({ headers }) {
	return {
		answer: 42
	};
}

export function getSession({ context }) {
	return context;
}
