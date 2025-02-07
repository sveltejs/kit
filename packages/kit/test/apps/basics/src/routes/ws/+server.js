/** @type {import('@sveltejs/kit').Socket} */
export const socket = {
	upgrade(req) {
		console.log(`[ws] upgrading ${req.url}...`);
	},

	open(peer) {
		console.log(`[ws] open: ${peer}`);
	},

	message(peer, message) {
		const data = message.text();
	
		console.log('[ws] message from client:', data);
	
		if (data === 'ping') {
			peer.send('pong - from /ws');
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
		}
	},

	close(peer, event) {
		console.log('[ws] close', peer, event);
	},

	error(peer, error) {
		console.log('[ws] error', peer, error);
	}
};
