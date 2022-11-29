import { building } from '$app/environment';
import { json } from '@sveltejs/kit';

if (!building) {
	// @ts-expect-error
	thisvariableisnotdefined;
}

export function GET() {
	return json({
		answer: 42
	});
}
