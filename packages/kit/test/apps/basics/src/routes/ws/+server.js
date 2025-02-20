/** @type {import('@sveltejs/kit').Socket} */
export const socket = {
	upgrade() {
		return {
			headers: {
				'Sec-WebSocket-Protocol': 'test'
			}
		}
	},
	open(peer) {
		peer.send('open hook works');
		peer.subscribe('chat');
	},
	message(peer, message) {
		const data = message.text();

		if (data === 'ping') {
			peer.send('pong');
			return;
		}

		if (data === 'close') {
			peer.close(1000, 'test');
			return;
		}

		peer.publish('chat', data);
	},
	close(peer, event) {
		if (event.reason === 'test') {
			peer.publish('chat', `close: ${event.code} ${event.reason}`);
		}
		peer.unsubscribe('chat');
	}
};
