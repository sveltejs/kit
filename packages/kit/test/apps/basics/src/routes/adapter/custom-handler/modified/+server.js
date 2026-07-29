import { text } from '@sveltejs/kit';

export function GET() {
	return text('handled by the server');
}
