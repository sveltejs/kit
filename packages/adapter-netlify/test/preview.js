// This allows us to run `netlify dev` without installing the Netlify CLI
// Don't include this file in type checking because @netlify/dev has transitive imports with type errors
import { NetlifyDev } from '@netlify/dev';
import http from 'node:http';
import { getRequest, setResponse } from '@sveltejs/kit/node';

const netlifyDev = new NetlifyDev({});

const serverReady = netlifyDev.start();

http
	.createServer(async (req, res) => {
		await serverReady;
		const request = await getRequest({ request: req, base: 'http://localhost:8888' });
		const response =
			(await netlifyDev.handle(request)) ?? new Response('Not Found', { status: 404 });
		await setResponse(res, response);
	})
	.listen(8888);
