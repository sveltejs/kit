import { accept } from '@sveltejs/kit';

let sockets = [];

export const socket = {
	upgrade(req) {
		console.log(`[ws] rejecting ${req.url}...`);
		return accept();
	},

	open(peer) {
		console.log(`[ws] open: ${peer}`);
		// console.log(peer);
	},

	message(peer, message) {
		console.log('[ws] message from client:', message.text());
		if (message.text().includes('ping')) {
			peer.send('pong - from /ws');
		}
		if (message.text().includes('add')) {
			sockets.push(peer);
			peer.send('added');
		}
		if (message.text().includes('broadcast')) {
			sockets.forEach((socket) => {
				socket.send(message.text());
			});
		}
	},

	close(peer, event) {
		console.log('[ws] close', peer, event);
		sockets = sockets.filter((socket) => socket !== peer);
	},

	error(peer, error) {
		console.log('[ws] error', peer, error);
	}
};
