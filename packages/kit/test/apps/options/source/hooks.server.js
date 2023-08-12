/** @type {import('@sveltejs/kit').Handle} */
export function handle({ event, resolve }) {
	return resolve(event, {
		// this allows us to check that <link rel="stylesheet"> is still added
		// to the DOM even if they're not included by `preload`
		preload: ({ type }) => type !== 'css'
	});
}
