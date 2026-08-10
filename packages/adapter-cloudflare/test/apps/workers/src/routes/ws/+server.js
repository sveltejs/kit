import { env } from 'cloudflare:workers';

export const GET = async ({ request }) => {
	const stub = env.DO.getByName('stub');
	return stub.fetch(request.url, request);
}
