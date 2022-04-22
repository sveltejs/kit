<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ url }) {
		const privateParam = url.searchParams.get('private');
		let privateCache = undefined;
		if (privateParam) {
			privateCache = privateParam === 'true' ? true : false;
		}

		return {
			cache: {
				maxage: 30,
				private: privateCache
			}
		};
	}
</script>

<script>
	import { session } from '$app/stores';

	const session_exists = !!$session;
</script>

<h1>this page will be cached for 30 seconds ({session_exists})</h1>
