export async function load({ fetch }) {
	const aborted_controller = new AbortController();
	aborted_controller.abort();

	let aborted_immediately = false;
	try {
		await fetch('/load/fetch-abort-signal/data', { signal: aborted_controller.signal });
	} catch (error) {
		if (error.name === 'AbortError') {
			aborted_immediately = true;
		}
	}

	let aborted_during_request = false;
	try {
		await fetch('/load/fetch-abort-signal/slow', { signal: AbortSignal.timeout(100) });
	} catch (error) {
		if (error.name === 'AbortError') {
			aborted_during_request = true;
		}
	}

	const successful_response = await fetch('/load/fetch-abort-signal/data');
	const successful_data = await successful_response.json();

	return {
		aborted_immediately,
		aborted_during_request,
		successful_data
	};
}
