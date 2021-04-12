module.exports = {
	async handler(event) {
		const { handler } = await import('./entry.mjs');
		return await handler(event);
	}
};
