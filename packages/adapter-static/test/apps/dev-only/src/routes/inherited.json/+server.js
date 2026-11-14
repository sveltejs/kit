import { json } from '@sveltejs/kit';

// inherits prerender from the root page that fetches it
export function GET() {
	return json({ answer: 42 });
}
