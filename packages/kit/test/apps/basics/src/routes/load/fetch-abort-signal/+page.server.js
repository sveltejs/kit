export async function load({ fetch }) {
	const abortedController = new AbortController();
	abortedController.abort();
	
	let abortedImmediately = false;
	try {
		await fetch('/load/fetch-abort-signal/data', { signal: abortedController.signal });
	} catch (error) {
		if (error.name === 'AbortError') {
			abortedImmediately = true;
		}
	}
	
	let abortedDuringRequest = false;
	try {
		await fetch('/load/fetch-abort-signal/slow', { signal: AbortSignal.timeout(100) });
	} catch (error) {
		if (error.name === 'AbortError') {
			abortedDuringRequest = true;
		}
	}
	
	const successfulResponse = await fetch('/load/fetch-abort-signal/data');
	const successfulData = await successfulResponse.json();
	
	return {
		abortedImmediately,
		abortedDuringRequest,
		successfulData
	};
} 