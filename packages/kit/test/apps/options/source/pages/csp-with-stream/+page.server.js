export function load() {
	return {
		lazy: new Promise((resolve) => setTimeout(() => resolve(), 1000)).then(() => 'Moo Deng!')
	};
}
