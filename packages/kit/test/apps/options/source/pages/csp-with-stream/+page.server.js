export function load() {
	return {
		lazy: new Promise((resolve) => setTimeout(() => resolve(null), 1000)).then(() => 'Moo Deng!')
	};
}
