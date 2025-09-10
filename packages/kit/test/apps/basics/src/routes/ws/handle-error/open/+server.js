/** @type {import('./$types').Socket} */
export const socket = {
	open(peer) {
		peer.send('opened');
		throw new Error('open hook');
	}
};
