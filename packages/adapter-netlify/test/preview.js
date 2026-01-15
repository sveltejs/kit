// This allows to run `netlify dev` without installing the Netlify CLI

import { NetlifyDev } from '@netlify/dev';

const netlifyDev = new NetlifyDev({});

const serverReady = netlifyDev.start();

export default {
	/**
	 * @param {Request} req
	 * @returns {Promise<Response>}
	 */
	async fetch(req) {
		await serverReady;
		const res = await netlifyDev.handle(req);
		return res ?? new Response('Not Found', { status: 404 });
	}
};
