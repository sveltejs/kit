import { text } from '@sveltejs/kit';

export function GET() {
	return text('/navigation-lifecycle/before-navigate/a');
}
