/** @type {import('./$types').Socket} */
export const socket = {
	message(peer) {
		peer.close(1000, 'test close hook error');
	},
	close(peer, details) {
		if (details.reason === 'test close hook error') {
			throw new Error('close hook');
		}
	}
};
