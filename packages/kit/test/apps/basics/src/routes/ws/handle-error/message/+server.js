/** @type {import('./$types').Socket} */
export const socket = {
	message(peer) {
		peer.send('message received');
		throw new Error('message hook');
	}
};
