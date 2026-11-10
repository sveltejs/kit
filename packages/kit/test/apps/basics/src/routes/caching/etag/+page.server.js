/** @type {import('./$types').PageServerLoad} */
export async function load({ setHeaders }) {
	setHeaders({
		etag: '"custom"'
	});
}
