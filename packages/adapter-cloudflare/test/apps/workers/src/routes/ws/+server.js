/** @type {import('./$types').Socket} */
export const socket = {
	open(peer) {
		peer.send('connected');
	}
};
