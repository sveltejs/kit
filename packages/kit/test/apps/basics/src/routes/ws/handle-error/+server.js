/** @type {import('@sveltejs/kit').Socket} */
export const socket = {
	upgrade(req) {
		const url = new URL(req.url);
		if (url.searchParams.has('error')) {
			throw new Error('upgrade hook');
		}
	},
	open(peer) {
		peer.send('opened');

		if (peer.websocket.protocol.includes('error')) {
			throw new Error('open hook');
		}
	},
	message(peer, message) {
		const data = message.text();

		if (data === 'close') {
			peer.close(1000, 'test close hook error');
			return;
		}

		peer.send('message received');
		throw new Error('message hook');
	},
	close(peer, details) {
		if (details.reason === 'test close hook error') {
			throw new Error('close hook');
		}
	}
};
