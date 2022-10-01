/** @type {import('./$types').RequestHandler} */
export function GET({ cookies }) {
	cookies.set('shadow-redirect-fetch', 'happy', {
		path: '/',
		secure: false // safari
	});
	return new Response('ok');
}
