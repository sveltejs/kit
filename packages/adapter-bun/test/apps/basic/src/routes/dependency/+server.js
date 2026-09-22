import { JSDOM } from 'jsdom';

/** @type {import('./$types').RequestHandler} */
export function GET() {
	const { document } = new JSDOM('<p>hello from a dependency</p>').window;
	return new Response(document.querySelector('p')?.textContent);
}
