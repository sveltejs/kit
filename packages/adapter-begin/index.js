export default function () {
	/** @type {import('@sveltejs/kit').Adapter} */
	const adapter = {
		name: '@sveltejs/adapter-begin',

		async adapt({ utils }) {
			console.log('@sveltejs/adapter-begin can now be found at architect/sveltekit-adapter.');
		}
	};

	return adapter;
}
