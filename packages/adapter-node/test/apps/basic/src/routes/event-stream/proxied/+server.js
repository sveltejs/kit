export function GET() {
	// responses from `fetch` have immutable headers
	return fetch('data:text/event-stream,data: hello%0A%0A');
}
