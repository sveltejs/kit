/** @type {import('@sveltejs/kit').Load} */
export function load() {
	throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");
	return {
		cache: { maxage: 300 }
	};
}
