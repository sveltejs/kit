/** @type {import("@sveltejs/kit").Handle} */
export async function handle({ event, resolve }) {
	// isolates the in-memory count in count.remote.js per browser session
	if (!event.cookies.get('count_session')) {
		event.cookies.set('count_session', crypto.randomUUID(), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax'
		});
	}

	return resolve(event, {
		// needed for link header preload tests
		preload: () => true
	});
}
