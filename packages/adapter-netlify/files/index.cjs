module.exports = {
	async handler(event) {
		const { handler } = await import('./handler.mjs');
		return await handler(event);
	}
};
