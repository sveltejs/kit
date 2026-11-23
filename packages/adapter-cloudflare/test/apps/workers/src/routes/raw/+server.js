import content from './content.txt?raw';

export function GET() {
	return new Response(content);
}
