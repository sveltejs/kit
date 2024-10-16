export function load() {
	return {
		a: 1,
		c: new Promise((resolve) => resolve())
	};
}
