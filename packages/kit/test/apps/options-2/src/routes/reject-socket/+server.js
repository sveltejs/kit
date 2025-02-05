import { error } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Socket} */
export const socket = {
	upgrade(req) {
		console.log(`[ws] upgrading ${req.url}...`);
		error(401, 'rejected');
	},

	open(peer) {
		console.log(`[ws] open: ${peer}`);
	},

	message(peer, message) {
		console.log('[ws] message', message.text());
	},

	close(peer, event) {
		console.log('[ws] close', peer, event);
	},

	error(peer, error) {
		console.log('[ws] error', peer, error);
	}
};
