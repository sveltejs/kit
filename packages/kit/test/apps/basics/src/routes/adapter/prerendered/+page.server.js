export const prerender = true;

export const config = {
	message: 'hello from prerendered page'
};

/** @type {import("./$types").PageServerLoad} */
export function load({ platform }) {
	return {
		platform
	};
}
