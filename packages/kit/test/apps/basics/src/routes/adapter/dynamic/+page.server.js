export const prerender = false;

export const config = {
	message: 'hello from dynamic page'
};

export function load({ platform }) {
	return {
		platform
	};
}
