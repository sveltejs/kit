<script context="module">
	/** @type {import("@sveltejs/kit").Load} */

	export async function load({ params }) {
		if (params.xyz !== 'ok') {
			return { fallthrough: true };
		}
		return {};
	}
</script>

<slot />
