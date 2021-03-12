module.exports = async (res, req) => {
	const { default: app } = await import('./entry.mjs');
	await app(res, req);
};
