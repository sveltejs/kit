import { NetlifyDev } from '@netlify/dev';

const netlifyDev = new NetlifyDev({
	projectRoot: 'build'
});

const serverReady = netlifyDev.start();
console.log(
	`Environment loaded. Emulating features: ${netlifyDev.getEnabledFeatures().join(', ')}.`
);

export default {
	async fetch(req) {
		await serverReady;
		const res = await netlifyDev.handle(req);
		return res ?? new Response('Not Found', { status: 404 });
	}
};
