/** @type {import('@sveltejs/kit').Socket} */
export const socket = {
	open(peer) {
		peer.subscribe('users');
	}
};
