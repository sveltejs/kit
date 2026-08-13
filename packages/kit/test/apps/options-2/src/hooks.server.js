/** @type {import("@sveltejs/kit/hooks").Handle} */
export async function handle({ event, resolve }) {
	// isolates the in-memory count in count.remote.js per browser session
	if (!event.cookies.get('session')) {
		event.cookies.set('session', crypto.randomUUID(), { path: '/' });
	}

	return resolve(event, {
		// needed for link header preload tests
		preload: () => true
	});
}
