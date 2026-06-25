/** @type {import("./$types").PageServerLoad} */
export function load({ url }) {
	console.log(url.searchParams);
}
