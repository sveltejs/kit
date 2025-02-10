/** @type {import('@sveltejs/kit').Socket} */
export const socket = {
	upgrade(req) {
		console.log(`[ws] upgrade ${req.headers.get('origin')}`);
	},

	open(peer) {
		console.log(`[ws] open: ${peer.id}`);
	},

	message(peer, message) {
		const data = message.text();

		console.log('[ws] message:', data);

		if (data === 'ping') {
			peer.send('pong');
			return;
		}

		if (data === 'add') {
			peer.send('added');
			return;
		}

		if (data === 'broadcast') {
			peer.peers.forEach((socket) => {
				socket.send(data);
			});
			return;
		}

		if (data === 'error') {
			throw new Error('client error');
		}
	},

	close(peer, event) {
		console.log('[ws] close', event);
	},

	error(peer, error) {
		console.log('[ws] error', error);
	}
};
