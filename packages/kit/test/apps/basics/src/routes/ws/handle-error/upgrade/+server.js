/** @type {import('@sveltejs/kit').Socket} */
export const socket = {
	upgrade() {
		throw new Error('upgrade hook');
	}
};
