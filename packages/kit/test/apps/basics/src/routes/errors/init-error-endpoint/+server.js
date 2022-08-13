import { json } from '@sveltejs/kit';

// @ts-expect-error
thisvariableisnotdefined;

export function GET() {
	return json({
		answer: 42
	});
}
