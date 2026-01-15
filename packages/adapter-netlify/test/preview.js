// This allows us to run `netlify dev` without installing the Netlify CLI
// Don't include this file in type checking because @netlify/dev has transitive imports with type errors
import { NetlifyDev } from '@netlify/dev';
import http from 'node:http';
import process from 'node:process';
import { getRequest, setResponse } from '@sveltejs/kit/node';

const netlifyDev = new NetlifyDev({});

const serverReady = netlifyDev.start();

const port = process.env.PORT ? +process.env.PORT : 8888;

http
	.createServer(async (req, res) => {
		await serverReady;
		const request = await getRequest({ request: req, base: `http://localhost:${port}` });
		const response =
			(await netlifyDev.handle(request)) ?? new Response('Not Found', { status: 404 });
		await setResponse(res, response);
	})
	.listen(port);
