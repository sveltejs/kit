export function GET() {
	// defined in vite.config.js
	// @ts-expect-error
	return new Response(__TEST_ENVIRONMENT__);
}
