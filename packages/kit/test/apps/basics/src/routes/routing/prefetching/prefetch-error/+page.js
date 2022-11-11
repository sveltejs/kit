let throw_error = false;

/** @type {import('@sveltejs/kit').Load} */
export async function load() {
	throw_error = !throw_error;
	if (throw_error) {
		throw new Error('error');
	}
}
