import text from './text.txt?raw';

export function GET() {
	return new Response(text);
}
