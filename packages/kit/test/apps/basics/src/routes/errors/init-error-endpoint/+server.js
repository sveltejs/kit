import { building } from '$app/environment';
import { json } from '@sveltejs/kit';

if (!building) {
	// @ts-expect-error
	// eslint-disable-next-line @typescript-eslint/no-unused-expressions
	thisvariableisnotdefined;
}

export function GET() {
	return json({
		answer: 42
	});
}
