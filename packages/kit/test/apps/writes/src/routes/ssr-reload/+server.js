import { message } from './message.js';

const id = Math.random();

export function GET() {
	return Response.json({ id, message });
}
