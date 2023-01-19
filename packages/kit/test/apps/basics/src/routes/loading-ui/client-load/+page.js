export async function load() {
	await new Promise((resolve) => setTimeout(resolve, 1000));
	return {
		data: Math.random()
	};
}
