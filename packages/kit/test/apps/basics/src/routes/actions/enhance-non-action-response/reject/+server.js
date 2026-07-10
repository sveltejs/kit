import { json } from '@sveltejs/kit';

export function POST() {
	return json({ message: 'Cross-site POST form submissions are forbidden' }, { status: 403 });
}
