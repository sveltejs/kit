/** @type {import('./$types').Socket} */
export const socket = {
	open(peer) {
		peer.send(`open: ${peer.event.url.pathname}`);
	},
	message(peer, message) {
		if (message.text() === 'close') {
			peer.close();
			return;
		}
		peer.send(`message: ${peer.event.url.pathname}`);
	}
};
