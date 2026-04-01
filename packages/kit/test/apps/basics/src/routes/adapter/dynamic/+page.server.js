export const prerender = false;

export const config = {
	message: 'hello from dynamic page'
};

/** @type {import('./$types').PageServerLoad} */
export function load({ platform }) {
	return {
		platform
	};
}
