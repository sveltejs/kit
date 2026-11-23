import post from './post.md?raw';

export function GET() {
	return new Response(post);
}
