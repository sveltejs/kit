import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
	ws.on('error', console.error);

	ws.on('message', (message) => {
		console.log('received: %s', message);
		ws.send(String(message));
	});
});

export function UPGRADE({ upgrade }) {
	wss.handleUpgrade(upgrade.request, upgrade.socket, upgrade.head, (ws) => {
		console.log('UPGRADED');
		wss.emit('connection', ws, upgrade.request);
	});
}
