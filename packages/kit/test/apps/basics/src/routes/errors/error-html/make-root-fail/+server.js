/**
 * @type {import('./$types').RequestHandler} param0
 */
export function GET({ cookies, url }) {
	cookies.set('fail-type', url.searchParams.get('type'), { path: '/' });
	return new Response();
}
