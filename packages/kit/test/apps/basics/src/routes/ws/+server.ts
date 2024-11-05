import { WebSocketServer } from 'ws';
// import { Server } from "socket.io";

const wss = new WebSocketServer({ noServer: true });
// const io = new Server();

wss.on('connection', (ws) => {
	ws.on('error', console.error);

	ws.on('message', (message) => {
		console.log('received: %s', message);
	});
});

export function UPGRADE({ upgrade }) {
	wss.handleUpgrade(upgrade.request, upgrade.socket, upgrade.head, (ws) => {
		console.log('UPGRADED');
		wss.emit('connection', ws, upgrade.request);
	});
}

export function GET({ request }) {
	console.log(request);

	return new Response('ok');
}
