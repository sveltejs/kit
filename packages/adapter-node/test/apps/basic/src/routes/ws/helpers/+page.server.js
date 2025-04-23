import { publish, getPeers } from '$app/server';

export const actions = {
	publish: async () => {
		publish('users', 'created a new user');
	},
	peers: async () => {
		const peers = getPeers();
		peers.forEach((peer) => {
			peer.send('sent to each peer');
		});
	}
};
