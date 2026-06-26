export async function load() {
	const ssrd = await new Promise((r) => setTimeout(() => r('ssrd'), 100));
	const streamed = new Promise((r) => setTimeout(() => r('streamed'), 200));
	return { ssrd, streamed };
}
