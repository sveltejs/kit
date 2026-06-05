import { fetch } from '../../../../src/exports.js';

export default {
	/** @type {typeof fetch} */
	async fetch(req, env, ctx) {
		const response = await fetch(req, env, ctx);
		response.headers.set('x-custom-worker', 'true');
		return response;
	}
};
