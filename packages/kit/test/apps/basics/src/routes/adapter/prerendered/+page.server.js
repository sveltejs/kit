export const prerender = true;

export const config = {
	message: 'hello from prerendered page'
};

export function load({ platform }) {
	return {
		platform
	};
}
