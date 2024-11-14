// Tests the case where a lazy promise is rejected before the rendering started
export async function load({ fetch }) {
	const eager = new Promise((resolve) => {
		setTimeout(() => {
			resolve('eager');
		}, 100);
	});

	return {
		eager: await eager,
		lazy: {
			fail: fetch('http://localhost:1337/')
		}
	};
}
