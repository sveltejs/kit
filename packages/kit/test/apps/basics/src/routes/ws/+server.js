import { error } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Socket} */
export const socket = {
	upgrade(req) {
		const url = new URL(req.url);
		if (url.searchParams.has('me')) {
			return;
		}
		error(403, 'Forbidden');
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

		peer.publish('chat', data);
	},
	close(peer, event) {
		peer.publish('chat', `close: ${event.code} ${event.reason}`);
		peer.unsubscribe('chat');
	},
	error(peer, error) {
		console.error(error);
	}
};
