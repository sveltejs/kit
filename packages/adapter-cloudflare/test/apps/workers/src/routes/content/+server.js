import post from './post.txt?raw';

export function GET() {
	return new Response(String(post.length));
}
