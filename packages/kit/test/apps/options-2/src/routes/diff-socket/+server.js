import { upgrade } from '$app/server';
import { text } from '@sveltejs/kit';

export const GET = () => {
	console.log(upgrade());
	return text('hello from /diff-socket');
};

let sockets = [];


export const socket = {
	upgrade(req) {
    console.log(`[ws] upgrading ${req.url}...`)
    return {
      headers: {}
    }
  },

  open(peer) {
    console.log(`[ws] open: ${peer}`);
  },

  message(peer, message) {
    console.log('[ws] message', message.text());
    if (message.text().includes('ping')) {
      peer.send('pong - from /diff-socket');
    }
		if(message.text().includes('add')) {
			sockets.push(peer);
			peer.send('added');
		}
		if(message.text().includes('broadcast')) {
			sockets.forEach(socket => {
				socket.send(message.text());
			});

		}
  },

  close(peer, event) {
    console.log('[ws] close', peer, event);
		sockets = sockets.filter(socket => socket !== peer);
  },

  error(peer, error) {
    console.log('[ws] error', peer, error);
  },
}
