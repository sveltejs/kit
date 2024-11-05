import { WebSocketServer } from 'ws';
// import { Server } from "socket.io";

const wss = new WebSocketServer({ noServer: true });
// const io = new Server();

export function UPGRADE({upgrade}) {
		console.log(request);
			wss.handleUpgrade(upgrade.request, upgrade.socket, upgrade.head, (ws) => {
				wss.emit('connection', ws, request);
			});
}

export function GET({request}) {
	console.log(request);

	return new Response('ok');
}
