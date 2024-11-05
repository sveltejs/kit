import { createServer } from 'node:http';
import { Server }from 'socket.io';

const httpServer  = createServer();
const io = new Server(httpServer);

io.on('connection', (socket) => {
	socket.on('error', console.error);

	socket.on('chat message', (data) => {
		console.log('received message: %s', data);
		socket.emit('chat message', data);
	});
});

export function UPGRADE({ upgrade }) {
	io.engine.handleUpgrade(upgrade.request, upgrade.socket, upgrade.head)
}
