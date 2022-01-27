import './shims';
import { getRequest, setResponse } from '@sveltejs/kit/node';
import { App } from 'APP';
import { manifest } from 'MANIFEST';

const app = new App(manifest);

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export default async (req, res) => {
	let request;

	try {
		request = await getRequest(`https://${req.headers.host}`, req);
	} catch (err) {
		res.statusCode = err.status || 400;
		return res.end(err.reason || 'Invalid request body');
	}

	setResponse(res, await app.render(request));
};
